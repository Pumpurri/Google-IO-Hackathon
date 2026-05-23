import base64
import os


def pick_key_frames(frames: list[str], count: int = 3) -> list[str]:
    """Pick evenly spaced key frames from the captured set."""
    if len(frames) <= count:
        return frames
    indices = [0, len(frames) // 2, len(frames) - 1]
    return [frames[i] for i in indices[:count]]


def strip_data_url_prefix(data_url: str) -> str:
    """Remove the data:image/jpeg;base64, prefix if present."""
    if "," in data_url:
        return data_url.split(",", 1)[1]
    return data_url


def load_reference_image_as_data_url(path: str) -> str:
    """Load a local image file and return it as a data URL."""
    if not os.path.exists(path):
        return ""
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(path)[1].lstrip(".")
    mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"
    return f"data:{mime};base64,{b64}"
