export const Q_CATALOGO = `
  query Catalogo($busqueda: String, $categoriaId: ID) {
    categorias {
      id
      nombre
      activo
    }
    productos(
      busqueda: $busqueda
      categoriaId: $categoriaId
    ) {
      id
      nombre
      descripcion
      precio
      imagen
      stock
      activo
      esFavorito
      categoria {
        id
        nombre
      }
    }
  }
`

export const Q_PRODUCTO = `
  query Producto($id: ID!) {
    producto(id: $id) {
      id
      nombre
      descripcion
      precio
      imagen
      stock
      activo
      esFavorito
      categoria {
        id
        nombre
      }
      categorias {
        id
        nombre
      }
    }
  }
`

export const Q_MIS_PEDIDOS = `
  query MisPedidos {
    misPedidos {
      id
      numeroPedido
      total
      status
      fecha
      detalles {
        id
        cantidad
        subtotal
        producto {
          id
          nombre
        }
      }
      pago {
        id
        proveedor
        estado
      }
    }
  }
`

export const M_REGISTRAR_PEDIDO = `
  mutation RegistrarPedido($datos: CrearPedidoInput!) {
    registrarPedido(datos: $datos) {
      id numeroPedido total status fecha
      pago { id proveedor estado }
    }
  }
`

export const M_LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      ok
      mensaje
      token
      usuario {
        id
        nombre
        email
        rol
        activo
      }
    }
  }
`

export const M_REGISTRAR_USUARIO = `
  mutation RegistrarUsuario($datos: RegistrarUsuarioInput!) {
    registrarUsuario(datos: $datos) {
      ok
      mensaje
      token
      usuario {
        id
        nombre
        email
        rol
        activo
      }
    }
  }
`


export const Q_DASHBOARD = `
  query Dashboard {
    dashboard {
      productos
      categorias
      usuarios
      pedidos
      pedidosPendientes
      pedidosPagados
      stockBajo
      ventas
    }

    pedidos {
      id
      numeroPedido
      fecha
      total
      status
      usuario {
        id
        nombre
        email
      }
    }

    pagosRecientes {
      id
      proveedor
      monto
      estado
      fecha
      pedido {
        id
        numeroPedido
      }
    }
  }
`


export const Q_ADMIN_PRODUCTOS = `
  query AdminProductos {
    categorias(incluirInactivas: true) {
      id
      nombre
      activo
    }
    productos(incluirInactivos: true, limite: 200) {
      id
      nombre
      descripcion
      precio
      imagen
      stock
      activo
      categoria {
        id
        nombre
        activo
      }
      categorias {
        id
        nombre
        activo
      }
    }
  }
`

export const M_CREAR_PRODUCTO = `
  mutation CrearProducto($datos: ProductoInput!) {
    crearProducto(datos: $datos) { id nombre }
  }
`

export const M_ACTUALIZAR_PRODUCTO = `
  mutation ActualizarProducto($id: ID!, $datos: ActualizarProductoInput!) {
    actualizarProducto(id: $id, datos: $datos) { id nombre stock activo }
  }
`

export const M_ELIMINAR_PRODUCTO = `
  mutation EliminarProducto($id: ID!) { eliminarProducto(id: $id) }
`

export const M_AJUSTAR_STOCK = `
  mutation AjustarStock($id: ID!, $stock: Int!) {
    ajustarStock(id: $id, stock: $stock) { id stock }
  }
`

export const Q_ADMIN_CATEGORIAS = `
  query AdminCategorias {
    categorias(incluirInactivas: true) {
      id nombre activo
      productos { id nombre activo }
    }
  }
`

export const M_CREAR_CATEGORIA = `
  mutation CrearCategoria($datos: CategoriaInput!) {
    crearCategoria(datos: $datos) { id nombre activo }
  }
`

export const M_ACTUALIZAR_CATEGORIA = `
  mutation ActualizarCategoria($id: ID!, $datos: CategoriaInput!) {
    actualizarCategoria(id: $id, datos: $datos) { id nombre activo }
  }
`

export const M_ELIMINAR_CATEGORIA = `
  mutation EliminarCategoria($id: ID!) { eliminarCategoria(id: $id) }
`

export const Q_ADMIN_PEDIDOS = `
  query AdminPedidos {
    pedidos {
      id numeroPedido fecha total status
      nombreReceptor ciudad estado codigoPostal
      usuario { id nombre email }
      pago { id proveedor estado monto }
      factura { id estado folio }
      detalles {
        id cantidad subtotal
        producto { id nombre }
      }
    }
  }
`

export const M_ESTADO_PEDIDO = `
  mutation EstadoPedido($id: ID!, $status: EstadoPedido!) {
    actualizarEstadoPedido(id: $id, status: $status) { id status }
  }
`

export const Q_ADMIN_PAGOS = `
  query AdminPagos {
    pagos {
      id proveedor referenciaExterna monto estado fecha
      pedido { id numeroPedido status }
    }
  }
`

export const M_ESTADO_PAGO = `
  mutation EstadoPago($id: ID!, $estado: String!) {
    actualizarEstadoPago(id: $id, estado: $estado) { id estado }
  }
`

export const Q_ADMIN_FACTURAS = `
  query AdminFacturas {
    facturas {
      id folio estado fecha xml
      pedido { id numeroPedido status total }
    }
    pedidos {
      id numeroPedido status total
      factura { id }
    }
  }
`

export const M_PREPARAR_FACTURA = `
  mutation PrepararFactura($pedidoId: ID!) {
    prepararFactura(pedidoId: $pedidoId) { id estado }
  }
`

export const Q_ADMIN_USUARIOS = `
  query AdminUsuarios(
    $busqueda: String
    $rol: RolUsuario
    $activo: Boolean
  ) {
    usuarios(
      busqueda: $busqueda
      rol: $rol
      activo: $activo
    ) {
      id
      nombre
      email
      rol
      activo
      pedidos {
        id
        total
        status
      }
    }
  }
`

export const M_ACTUALIZAR_USUARIO = `
  mutation ActualizarUsuario($id: ID!, $rol: RolUsuario, $activo: Boolean) {
    actualizarUsuario(id: $id, rol: $rol, activo: $activo) { id rol activo }
  }
`

export const Q_CATEGORIAS = `
  query Categorias { categorias { id nombre activo } }
`

export const M_CREAR_PREFERENCIA_MERCADO_PAGO = `
  mutation CrearPreferenciaMercadoPago($pedidoId: ID!) {
    crearPreferenciaMercadoPago(pedidoId: $pedidoId) {
      id
      url
      sandboxUrl
    }
  }
`

export const M_CONFIRMAR_PAGO_MERCADO_PAGO = `
  mutation ConfirmarPagoMercadoPago(
    $pedidoId: ID!
    $pagoId: ID!
  ) {
    confirmarPagoMercadoPago(
      pedidoId: $pedidoId
      pagoId: $pagoId
    ) {
      id
      numeroPedido
      status
      pago {
        id
        estado
        referenciaExterna
      }
    }
  }
`

export const M_CREAR_ORDEN_PAYPAL = `
  mutation CrearOrdenPayPal($pedidoId: ID!) {
    crearOrdenPayPal(pedidoId: $pedidoId) {
      id
    }
  }
`

export const M_CAPTURAR_ORDEN_PAYPAL = `
  mutation CapturarOrdenPayPal(
    $pedidoId: ID!
    $paypalOrderId: ID!
  ) {
    capturarOrdenPayPal(
      pedidoId: $pedidoId
      paypalOrderId: $paypalOrderId
    ) {
      id
      numeroPedido
      total
      status
      pago {
        id
        proveedor
        estado
      }
    }
  }
`

export const M_SINCRONIZAR_PAGO_PAYPAL = `
  mutation SincronizarPagoPayPal($pedidoId: ID!) {
    sincronizarPagoPayPal(pedidoId: $pedidoId) {
      id
      numeroPedido
      status
      pago {
        id
        proveedor
        estado
      }
    }
  }
`

export const M_COBRAR_TARJETA_MP = `
  mutation CobrarTarjetaMercadoPago(
    $pedidoId: ID!
    $datos: TarjetaIntegradaInput!
  ) {
    cobrarTarjetaMercadoPago(
      pedidoId: $pedidoId
      datos: $datos
    ) {
      estado
      mensaje
      pagoId
      pedido {
        id
        numeroPedido
        total
        status
        pago {
          id
          proveedor
          estado
        }
      }
    }
  }
`

export const M_CONSULTAR_PAGO_MP = `
  mutation ConsultarPagoMercadoPago(
    $pedidoId: ID!
  ) {
    consultarPagoMercadoPago(
      pedidoId: $pedidoId
    ) {
      estado
      mensaje
      pagoId
      pedido {
        id
        numeroPedido
        total
        status
        pago {
          id
          proveedor
          estado
        }
      }
    }
  }
`

export const S_BACKOFFICE = `
  subscription EventoBackoffice {
    eventoBackoffice {
      tipo
      entidadId
      operacion
      fecha
    }
  }
`

export const S_CATALOGO = `
  subscription CatalogoActualizado {
    catalogoActualizado
  }
`
export const Q_MIS_FAVORITOS = `
  query MisFavoritos {
    misFavoritos {
      id
      nombre
      descripcion
      precio
      imagen
      stock
      activo
      esFavorito
      categoria {
        id
        nombre
      }
    }
  }
`

export const M_ALTERNAR_FAVORITO = `
  mutation AlternarFavorito($productoId: ID!) {
    alternarFavorito(productoId: $productoId)
  }
`

export const M_SOLICITAR_RECUPERACION = `
  mutation SolicitarRecuperacionPassword($email: String!) {
    solicitarRecuperacionPassword(email: $email)
  }
`

export const M_RESTABLECER_PASSWORD = `
  mutation RestablecerPassword($token: String!, $nuevaPassword: String!) {
    restablecerPassword(token: $token, nuevaPassword: $nuevaPassword)
  }
`