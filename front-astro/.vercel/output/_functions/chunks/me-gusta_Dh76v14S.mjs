import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/me-gusta.astro
var me_gusta_exports = /* @__PURE__ */ __exportAll({
	default: () => $$MeGusta,
	file: () => $$file,
	url: () => $$url
});
var $$MeGusta = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Me gusta | Quest Merchant" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "Favorites", null, {
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/views/client/Favorites.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/me-gusta.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/me-gusta.astro";
var $$url = "/me-gusta";
// \0virtual:astro:page:src/pages/me-gusta@_@astro
var page = () => me_gusta_exports;
export { page };
