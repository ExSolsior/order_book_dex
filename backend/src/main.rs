use {
    actix_web::web::{self, Data, ServiceConfig},
    anyhow::Context,
    chrono::{DateTime, Utc},
    clokwerk::{AsyncScheduler, TimeUnits},
    futures_util::StreamExt,
    services::{
        cancel_limit_order, execute_market_order, logs_handler, market_history, market_list,
        market_order_book, open_limit_order, sanity_check, scheduled_process,
    },
    shuttle_actix_web::ShuttleActixWeb,
    shuttle_runtime::SecretStore,
    solana_pubsub_client::nonblocking::pubsub_client::PubsubClient,
    solana_rpc_client_api::config::{RpcTransactionLogsConfig, RpcTransactionLogsFilter},
    sqlx::{postgres::PgPoolOptions, Pool, Postgres},
    std::{sync::Arc, time::Duration},
    tokio::{
        io::AsyncReadExt,
        sync::{mpsc::unbounded_channel, OnceCell},
    },
};

mod db;
mod services;
pub mod transactions;

pub static POOL: OnceCell<Pool<Postgres>> = OnceCell::const_new();

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> ShuttleActixWeb<impl FnOnce(&mut ServiceConfig) + Send + Clone + 'static> {
    let db_url = secrets.get("DB_URL").context("secret was not found")?;
    let ws_url = secrets.get("WS_URL").context("secret was not found")?;

    println!("{db_url}");

    let pool = POOL
        .get_or_try_init(|| async {
            PgPoolOptions::new()
                .max_connections(5)
                .connect(&db_url)
                .await
        })
        .await
        .expect("Error building a connection pool.");

    let app_state = AppState { pool: pool.clone() };

    // solana events
    tokio::spawn(async move {
        // Subscription tasks will send a ready signal when they have subscribed.
        let (ready_sender, mut ready_receiver) = unbounded_channel::<()>();

        // Channel to receive unsubscribe channels (actually closures).
        // These receive a pair of `(Box<dyn FnOnce() -> BoxFuture<'static, ()> + Send>), &'static str)`,
        // where the first is a closure to call to unsubscribe, the second is the subscription name.
        let (unsubscribe_sender, mut unsubscribe_receiver) =
            unbounded_channel::<(_, &'static str)>();

        // The `PubsubClient` must be `Arc`ed to share it across tasks.
        let pubsub_client = Arc::new(PubsubClient::new(&ws_url).await.unwrap());

        let mut join_handles = vec![];

        join_handles.push((
            "logs",
            tokio::spawn({
                // Clone things we need before moving their clones into the `async move` block.
                //
                // The subscriptions have to be made from the tasks that will receive the subscription messages,
                // because the subscription streams hold a reference to the `PubsubClient`.
                // Otherwise we would just subscribe on the main task and send the receivers out to other tasks.

                let ready_sender = ready_sender.clone();
                let unsubscribe_sender = unsubscribe_sender.clone();
                let pubsub_client = Arc::clone(&pubsub_client);
                async move {
                    let (mut logs_notifications, logs_unsubscribe) = pubsub_client
                        .logs_subscribe(
                            RpcTransactionLogsFilter::Mentions(vec![String::from(
                                "4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9",
                            )]),
                            RpcTransactionLogsConfig { commitment: None },
                        )
                        .await?;

                    // With the subscription started,
                    // send a signal back to the main task for synchronization.
                    ready_sender.send(()).expect("channel");

                    // Send the unsubscribe closure back to the main task.
                    unsubscribe_sender
                        .send((logs_unsubscribe, "logs"))
                        .map_err(|e| format!("{}", e))
                        .expect("channel");

                    // Drop senders so that the channels can close.
                    // The main task will receive until channels are closed.
                    drop((ready_sender, unsubscribe_sender));

                    // Do something with the subscribed messages.
                    // This loop will end once the main task unsubscribes.
                    while let Some(logs_info) = logs_notifications.next().await {
                        logs_handler(logs_info, app_state.clone()).await;
                    }

                    // This type hint is necessary to allow the `async move` block to use `?`.
                    Ok::<_, anyhow::Error>(())
                }
            }),
        ));

        // Drop these senders so that the channels can close
        // and their receivers return `None` below.
        drop(ready_sender);
        drop(unsubscribe_sender);

        // Wait until all subscribers are ready before proceeding with application logic.
        while let Some(_) = ready_receiver.recv().await {}

        // Do application logic here.

        let dt: DateTime<Utc> = Utc::now();
        let mut schduler = AsyncScheduler::new();

        schduler.every(1.minutes()).run(move || {
            let dt: DateTime<Utc> = Utc::now();
            println!("{}", dt.timestamp());
            scheduled_process()
        });

        tokio::spawn(async move {
            let sync = 60 - (dt.timestamp() - (dt.timestamp() / 60 * 60)) as u64;
            println!("sync: {}", sync);
            tokio::time::sleep(Duration::from_secs(sync)).await;
            loop {
                schduler.run_pending().await;
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
        });

        // Wait for input or some application-specific shutdown condition.
        tokio::io::stdin().read_u8().await.unwrap();

        // Unsubscribe from everything, which will shutdown all the tasks.
        while let Some((unsubscribe, name)) = unsubscribe_receiver.recv().await {
            println!("unsubscribing from {}", name);
            unsubscribe().await
        }

        // Wait for the tasks.
        for (name, handle) in join_handles {
            println!("waiting on task {}", name);
            if let Ok(Err(e)) = handle.await {
                println!("task {} failed: {}", name, e);
            }
        }
    });

    let config = move |cfg: &mut ServiceConfig| {
        cfg.service(
            web::scope("/api")
                .service(market_order_book)
                .service(market_list)
                .service(market_history)
                .service(open_limit_order)
                .service(cancel_limit_order)
                .service(execute_market_order)
                .service(sanity_check)
                .app_data(Data::new(AppState { pool: pool.clone() })),
        );
    };

    Ok(config.into())
}
