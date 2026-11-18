/** Saves an on-screen SVG chart as a PNG (CSS variables are resolved so colours survive). */
export function downloadSvgAsPng(svg: SVGSVGElement, filename: string, scale = 2) {
  const cs = getComputedStyle(document.documentElement);
  const vb = svg.viewBox.baseVal;
  const w = vb.width || svg.clientWidth;
  const h = vb.height || svg.clientHeight;
  let xml = new XMLSerializer().serializeToString(svg);
  xml = xml.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name: string) => cs.getPropertyValue(name).trim() || "#888");
  if (!/xmlns=/.test(xml)) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  xml = xml.replace(/<svg([^>]*?)>/, `<svg$1 width="${w}" height="${h}">`);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = cs.getPropertyValue("--color-surface").trim() || "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
