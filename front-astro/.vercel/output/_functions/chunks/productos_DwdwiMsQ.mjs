import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/admin/productos.astro
var productos_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Productos,
	file: () => $$file,
	url: () => $$url
});
var $$Productos = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "productos" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AdminPage", null, {
		"page": "productos",
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/components/AdminPage.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/productos.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/admin/productos.astro";
var $$url = "/admin/productos";
// \0virtual:astro:page:src/pages/admin/productos@_@astro
var page = () => productos_exports;
export { page };
