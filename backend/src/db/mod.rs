pub mod models;

// scratch pad, experiement
pub fn find(data: Vec<String>) -> String {
    let mut result = String::from("");

    for (i, value) in data.iter().enumerate() {
        let f = data[i..].to_vec();

        if f.iter().find(|item| *item == value).is_none() {
            result = value.clone();
            break;
        }
    }

    return result;
}
