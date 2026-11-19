import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as renderTemplate, i as renderComponent } from "./server_CL1LjsOv.mjs";
import { n as createComponent } from "./compiler_Chxsx96T.mjs";
import { t as $$BaseLayout } from "./BaseLayout_DV7n6upu.mjs";
// src/pages/recuperar-contrasena.astro
var recuperar_contrasena_exports = /* @__PURE__ */ __exportAll({
	default: () => $$RecuperarContrasena,
	file: () => $$file,
	url: () => $$url
});
var $$RecuperarContrasena = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Recuperar contraseña | Quest Merchant" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PasswordRecovery", null, {
		"mode": "request",
		"client:only": "react",
		"client:component-hydration": "only",
		"client:component-path": "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/views/client/PasswordRecovery.jsx",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/recuperar-contrasena.astro", void 0);
var $$file = "C:/Users/ipala/Downloads/P3-2_codigo_23300692/proyecto-de-web-master/front-astro/src/pages/recuperar-contrasena.astro";
var $$url = "/recuperar-contrasena";
// \0virtual:astro:page:src/pages/recuperar-contrasena@_@astro
var page = () => recuperar_contrasena_exports;
export { page };
