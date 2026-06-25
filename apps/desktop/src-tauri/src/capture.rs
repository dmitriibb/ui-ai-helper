use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageFormat;
use screenshots::Screen;

/// Capture a rectangular region of the screen.
///
/// `abs_x` / `abs_y` are absolute physical-pixel screen coordinates
/// (0,0 = top-left of the primary monitor's virtual screen origin).
///
/// Returns a Base64-encoded PNG string on success.
pub fn capture_region(abs_x: i32, abs_y: i32, width: u32, height: u32) -> Result<String, String> {
    if width == 0 || height == 0 {
        return Err("Capture dimensions must be greater than zero".to_string());
    }

    let screen =
        Screen::from_point(abs_x, abs_y).map_err(|e| format!("Cannot find screen: {e}"))?;

    // capture_area coordinates are relative to this display's origin
    let rel_x = abs_x - screen.display_info.x;
    let rel_y = abs_y - screen.display_info.y;

    let rgba_image = screen
        .capture_area(rel_x, rel_y, width, height)
        .map_err(|e| format!("Screen capture failed: {e}"))?;

    // Encode to PNG via the `image` crate
    let dyn_image = image::DynamicImage::ImageRgba8(rgba_image);
    let mut png_data: Vec<u8> = Vec::new();
    dyn_image
        .write_to(&mut std::io::Cursor::new(&mut png_data), ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {e}"))?;

    Ok(STANDARD.encode(&png_data))
}
