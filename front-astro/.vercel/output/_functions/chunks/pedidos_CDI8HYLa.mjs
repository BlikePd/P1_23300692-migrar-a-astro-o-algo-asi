import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/admin/pedidos.astro
var pedidos_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Pedidos,
	file: () => $$file,
	url: () => $$url
});
var $$Pedidos = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "pedidos" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AdminPage", null, {
		"page": "pedidos",
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/components/AdminPage.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/pedidos.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/pedidos.astro";
var $$url = "/admin/pedidos";
// \0virtual:astro:page:src/pages/admin/pedidos@_@astro
var page = () => pedidos_exports;
export { page };
