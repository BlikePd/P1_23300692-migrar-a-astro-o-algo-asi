import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/admin/facturas.astro
var facturas_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Facturas,
	file: () => $$file,
	url: () => $$url
});
var $$Facturas = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "facturas" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AdminPage", null, {
		"page": "facturas",
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/components/AdminPage.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/facturas.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/facturas.astro";
var $$url = "/admin/facturas";
// \0virtual:astro:page:src/pages/admin/facturas@_@astro
var page = () => facturas_exports;
export { page };
