use anyhow::Result;
use futures_util::StreamExt;
use solana_pubsub_client::nonblocking::pubsub_client::PubsubClient;
use solana_rpc_client_api::config::{RpcTransactionLogsConfig, RpcTransactionLogsFilter};
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::sync::mpsc::unbounded_channel;

//

// use crate::services::{market_history, market_list, market_order_book};
// use actix_web::{web::Data, App, HttpServer};
// use sqlx::{postgres::PgPoolOptions, Pool, Postgres};

// #[derive(Clone)]
// pub struct AppState {
//     pub pool: Pool<Postgres>,
// }

pub async fn watch_subscriptions(websocket_url: &str) -> Result<()> {
    println!("HELP");

    // const DB_URL: &str = "postgres://postgres:admin0rderb00kdex@127.0.0.1:5431/";

    // let pool = PgPoolOptions::new()
    //     .max_connections(5)
    //     .connect(DB_URL)
    //     .await
    //     .expect("Error building a connection pool.");

    // Subscription tasks will send a ready signal when they have subscribed.
    let (ready_sender, mut ready_receiver) = unbounded_channel::<()>();

    // Channel to receive unsubscribe channels (actually closures).
    // These receive a pair of `(Box<dyn FnOnce() -> BoxFuture<'static, ()> + Send>), &'static str)`,
    // where the first is a closure to call to unsubscribe, the second is the subscription name.
    let (unsubscribe_sender, mut unsubscribe_receiver) = unbounded_channel::<(_, &'static str)>();

    // The `PubsubClient` must be `Arc`ed to share it across tasks.
    let pubsub_client = Arc::new(PubsubClient::new(websocket_url).await?);

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
                            "11111111111111111111111111111111",
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
                    println!("------------------------------------------------------------");
                    println!("logs pubsub result: {:?}", logs_info);
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
    println!("no idea????");

    // Wait for input or some application-specific shutdown condition.
    tokio::io::stdin().read_u8().await?;
    println!("no juice????");
    // HttpServer::new(move || {
    //     App::new()
    //         .app_data(Data::new(AppState { pool: pool.clone() }))
    //         .service(market_order_book)
    //         .service(market_list)
    //         .service(market_history)
    // })
    // .bind(("127.0.0.1", 8080))?
    // .run()
    // .await?;

    // Unsubscribe from everything, which will shutdown all the tasks.
    while let Some((unsubscribe, name)) = unsubscribe_receiver.recv().await {
        println!("unsubscribing from {}", name);
        unsubscribe().await
    }
    println!("no beast????");

    // Wait for the tasks.
    for (name, handle) in join_handles {
        println!("waiting on task {}", name);
        if let Ok(Err(e)) = handle.await {
            println!("task {} failed: {}", name, e);
        }
    }
    println!("last????");

    Ok(())
}
