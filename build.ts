import * as esbuild from "esbuild";

const serve = process.argv.includes("--serve");

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/bundle.js",
  format: "iife",
  target: "es2020",
  sourcemap: true,
  minify: !serve,
};

async function main() {
  if (serve) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    const { host, port } = await ctx.serve({ servedir: "dist" });
    console.log(`Serving at http://${host}:${port}`);
  } else {
    await esbuild.build(buildOptions);
    console.log("Built dist/bundle.js");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
