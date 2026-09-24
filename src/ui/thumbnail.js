export function drawThumbnail(thumb, source) {
  const ctx = thumb.getContext('2d');
  ctx.clearRect(0, 0, thumb.width, thumb.height);
  const scale = Math.min(thumb.width / source.width, thumb.height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
}
