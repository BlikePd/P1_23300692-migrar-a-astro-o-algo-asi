import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/carrito.astro
var carrito_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Carrito,
	file: () => $$file,
	url: () => $$url
});
var $$Carrito = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Carrito" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "Cart", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/views/client/Cart.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/carrito.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/carrito.astro";
var $$url = "/carrito";
// \0virtual:astro:page:src/pages/carrito@_@astro
var page = () => carrito_exports;
export { page };
