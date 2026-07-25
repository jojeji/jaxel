// Datei-I/O mit Encoding-Erkennung (docs/entscheidungen.md #9): BOM zuerst,
// sonst die `encoding="..."`-Angabe in einer XML-Deklaration, sonst UTF-8.

use encoding_rs::Encoding;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

/// Cheap file identity for external-change detection (docs/entscheidungen.md 2026-07-18 #4):
/// mtime + size, not a full re-read — files can be several 100 MB (see docs/architektur.md).
pub struct FileStat {
    pub mtime_ms: u64,
    pub size: u64,
}

fn stat_of(path: &Path) -> Result<FileStat, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let mtime_ms = metadata
        .modified()
        .map_err(|error| error.to_string())?
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis() as u64;
    Ok(FileStat {
        mtime_ms,
        size: metadata.len(),
    })
}

pub struct DecodedFile {
    pub content: String,
    pub encoding: String,
    pub stat: FileStat,
}

fn sniff_xml_declared_encoding(bytes: &[u8]) -> Option<&'static Encoding> {
    // Die XML-Deklaration ist reines ASCII und steht immer am Dateianfang;
    // ein einfacher Byte-Scan der ersten 200 Bytes reicht.
    let head = &bytes[..bytes.len().min(200)];
    let head_str = std::str::from_utf8(head).ok()?;
    let decl_end = head_str.find("?>")?;
    let decl = &head_str[..decl_end];
    let key = "encoding=";
    let start = decl.find(key)? + key.len();
    let quote = decl.as_bytes().get(start).copied()?;
    if quote != b'"' && quote != b'\'' {
        return None;
    }
    let rest = &decl[start + 1..];
    let end = rest.find(quote as char)?;
    Encoding::for_label(rest[..end].as_bytes())
}

fn detect_encoding(bytes: &[u8]) -> &'static Encoding {
    if let Some((encoding, _bom_len)) = Encoding::for_bom(bytes) {
        return encoding;
    }
    sniff_xml_declared_encoding(bytes).unwrap_or(encoding_rs::UTF_8)
}

pub fn read_text_file(path: &Path) -> Result<DecodedFile, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let encoding = detect_encoding(&bytes);
    let (content, _actual_encoding, _had_errors) = encoding.decode(&bytes);
    let stat = stat_of(path)?;
    Ok(DecodedFile {
        content: content.into_owned(),
        encoding: encoding.name().to_string(),
        stat,
    })
}

pub fn write_text_file(path: &Path, content: &str, encoding_name: &str) -> Result<FileStat, String> {
    let encoding = Encoding::for_label(encoding_name.as_bytes()).unwrap_or(encoding_rs::UTF_8);
    let (bytes, _actual_encoding, _had_unmappable) = encoding.encode(content);
    fs::write(path, bytes).map_err(|error| error.to_string())?;
    stat_of(path)
}

/// Used for the external-change check (Fenster-Fokus-Wiedergewinn, siehe App.tsx) — metadata
/// only, deliberately no content read.
pub fn stat_file(path: &Path) -> Result<FileStat, String> {
    stat_of(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_utf8_bom_regardless_of_content() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"<root/>");
        assert_eq!(detect_encoding(&bytes).name(), "UTF-8");
    }

    #[test]
    fn detects_utf16le_bom() {
        let bytes = [0xFF, 0xFE, b'<', 0, b'a', 0];
        assert_eq!(detect_encoding(&bytes).name(), "UTF-16LE");
    }

    #[test]
    fn sniffs_declared_encoding_from_xml_prolog() {
        let bytes = b"<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "windows-1252"); // encoding_rs' ISO-8859-1 alias
    }

    #[test]
    fn accepts_single_quotes_around_the_declared_encoding() {
        let bytes = b"<?xml version='1.0' encoding='UTF-16'?><root/>";
        assert!(sniff_xml_declared_encoding(bytes).is_some());
    }

    #[test]
    fn falls_back_to_utf8_without_a_bom_or_declaration() {
        let bytes = b"<root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn falls_back_to_utf8_when_the_declaration_has_no_encoding_attribute() {
        let bytes = b"<?xml version=\"1.0\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn falls_back_to_utf8_when_the_encoding_value_is_unquoted() {
        // Malformed prolog (no opening quote after "encoding=") — must not panic, must not
        // misparse; sniffing simply finds nothing usable.
        let bytes = b"<?xml version=\"1.0\" encoding=UTF-16?><root/>";
        assert!(sniff_xml_declared_encoding(bytes).is_none());
    }

    #[test]
    fn falls_back_to_utf8_when_the_declared_label_is_unknown() {
        let bytes = b"<?xml version=\"1.0\" encoding=\"not-a-real-encoding\"?><root/>";
        assert_eq!(detect_encoding(bytes).name(), "UTF-8");
    }

    #[test]
    fn only_scans_the_first_200_bytes() {
        // A declaration starting past byte 200 must not be found — matches the doc comment's
        // "reicht ein Scan der ersten 200 Bytes" assumption for where the XML declaration lives.
        let padding = " ".repeat(250);
        let bytes = format!("<!--{padding}--><?xml version=\"1.0\" encoding=\"UTF-16\"?><root/>");
        assert!(sniff_xml_declared_encoding(bytes.as_bytes()).is_none());
    }

    #[test]
    fn a_bom_wins_over_a_conflicting_xml_declaration() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"<?xml version=\"1.0\" encoding=\"UTF-16\"?><root/>");
        assert_eq!(detect_encoding(&bytes).name(), "UTF-8");
    }
}
