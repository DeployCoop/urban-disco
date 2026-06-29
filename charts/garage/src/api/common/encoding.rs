//! Module containing various helpers for encoding

use std::fmt::Write as _;

/// Encode &str for use in a URI
pub fn uri_encode(string: &str, encode_slash: bool) -> String {
	let mut result = String::with_capacity(string.len() * 2);
	for c in string.chars() {
		match c {
			'a'..='z' | 'A'..='Z' | '0'..='9' | '_' | '-' | '~' | '.' => result.push(c),
			'/' if encode_slash => result.push_str("%2F"),
			'/' if !encode_slash => result.push('/'),
			_ => {
				let mut buf = [0_u8; 4];
				let str = c.encode_utf8(&mut buf);
				for b in str.bytes() {
					write!(&mut result, "%{:02X}", b).unwrap();
				}
			}
		}
	}
	result
}

#[cfg(test)]
mod tests {
	use crate::encoding::uri_encode;

	#[test]
	fn test_uri_encode() {
		let url1_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/documentation/reference-manual/features/",
			true,
		);
		assert_eq!(
			&url1_encoded,
			"https%3A%2F%2Fgaragehq.deuxfleurs.fr%2Fdocumentation%2Freference-manual%2Ffeatures%2F"
		);

		let url2_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/blog/2025-06-garage-v2/",
			true,
		);
		assert_eq!(
			&url2_encoded,
			"https%3A%2F%2Fgaragehq.deuxfleurs.fr%2Fblog%2F2025-06-garage-v2%2F"
		);

		let url3_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/blog/2025-06-hé_les_gens/",
			true,
		);
		assert_eq!(
			&url3_encoded,
			"https%3A%2F%2Fgaragehq.deuxfleurs.fr%2Fblog%2F2025-06-h%C3%A9_les_gens%2F"
		);

		let url4_encoded = uri_encode("/home/local user/Documents/personnel/à_blog.md", true);
		assert_eq!(
			&url4_encoded,
			"%2Fhome%2Flocal%20user%2FDocuments%2Fpersonnel%2F%C3%A0_blog.md"
		);
	}

	#[test]
	fn test_uri_encode_without_slash() {
		let url1_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/documentation/reference-manual/features/",
			false,
		);
		assert_eq!(
			&url1_encoded,
			"https%3A//garagehq.deuxfleurs.fr/documentation/reference-manual/features/"
		);

		let url2_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/blog/2025-06-garage-v2/",
			false,
		);
		assert_eq!(
			&url2_encoded,
			"https%3A//garagehq.deuxfleurs.fr/blog/2025-06-garage-v2/"
		);

		let url3_encoded = uri_encode(
			"https://garagehq.deuxfleurs.fr/blog/2025-06-hé_les_gens/",
			false,
		);
		assert_eq!(
			&url3_encoded,
			"https%3A//garagehq.deuxfleurs.fr/blog/2025-06-h%C3%A9_les_gens/"
		);
		let url4_encoded = uri_encode("/home/local user/Documents/personnel/à_blog.md", false);
		assert_eq!(
			&url4_encoded,
			"/home/local%20user/Documents/personnel/%C3%A0_blog.md"
		);
	}

	#[test]
	fn test_uri_encode_most_than_double_size() {
		let url_encoded = uri_encode("/home/ùàé ç/çaèù/à_êô.md", true);
		assert_eq!(
			&url_encoded,
			"%2Fhome%2F%C3%B9%C3%A0%C3%A9%20%C3%A7%2F%C3%A7a%C3%A8%C3%B9%2F%C3%A0_%C3%AA%C3%B4.md"
		);
	}
}
