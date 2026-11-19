import { a as Fragment, c as renderSlot, d as renderTemplate, h as createRenderInstruction, i as renderComponent, m as addAttribute, p as renderHead, x as unescapeHTML } from "./server_CL1LjsOv.mjs";
import { n as createComponent, t as createAstro } from "./compiler_Chxsx96T.mjs";
// node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
// \0virtual:pwa-info
var pwaInfo = {
	"pwaInDevEnvironment": false,
	"webManifest": {
		"href": "/manifest.webmanifest",
		"useCredentials": false,
		"linkTag": "<link rel=\"manifest\" href=\"/manifest.webmanifest\">"
	}
};
// src/layouts/BaseLayout.astro
createAstro("https://astro.build");
var $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BaseLayout;
	const { title = "Quest Merchant | Tienda de juegos de rol", description = "Descubre manuales, dados, miniaturas y accesorios para tus aventuras de rol en Quest Merchant.", noReferrer = false } = Astro.props;
	return renderTemplate`<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><!-- SEO: descripción de la página --><meta name="description"${addAttribute(description, "content")}><!-- PWA: manifiesto, color de barra e icono iOS --><meta name="theme-color" content="#7389c3"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">${pwaInfo && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${unescapeHTML(pwaInfo.webManifest.linkTag)}` })}`}<!-- Política de referencia -->${noReferrer && renderTemplate`<meta name="referrer" content="no-referrer">`}${renderHead($$result)}</head><body>${renderSlot($$result, $$slots["default"])}${renderComponent($$result, "InstallPWA", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/components/InstallPWA.jsx",
		"client:component-export": "default"
	})}${renderScript($$result, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/layouts/BaseLayout.astro?astro&type=script&index=0&lang.ts")}</body></html>`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/layouts/BaseLayout.astro", void 0);
export { $$BaseLayout as t };
