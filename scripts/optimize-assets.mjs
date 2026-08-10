import sharp from "sharp";

await sharp("public/assets/hero-collaboration.png")
  .resize({
    width: 1600,
    withoutEnlargement: true,
  })
  .webp({
    quality: 82,
    effort: 6,
  })
  .toFile(
    "public/assets/hero-collaboration.webp"
  );

await sharp("public/assets/paint-swatch.png")
  .resize({
    width: 256,
    withoutEnlargement: true,
  })
  .png({
    compressionLevel: 9,
    palette: true,
  })
  .toFile(
    "public/assets/paint-swatch-mask.png"
  );

console.log("图片优化完成");
