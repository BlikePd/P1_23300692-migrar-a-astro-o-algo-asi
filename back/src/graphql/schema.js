export const typeDefs = `#graphql
  enum RolUsuario {
    CLIENTE
    ADMIN
  }

  enum EstadoPedido {
    PENDIENTE
    PAGADO
    EN_PREPARACION
    ENVIADO
    ENTREGADO
    CANCELADO
  }

  enum ProveedorPago {
    PAYPAL
    MERCADO_PAGO
  }

  type Categoria {
    id: ID!
    nombre: String!
    activo: Boolean!
    productos: [Producto!]!
  }

  type Producto {
    id: ID!
    nombre: String!
    descripcion: String
    precio: Float!
    imagen: String
    stock: Int!
    activo: Boolean!
    categoria: Categoria!
    categorias: [Categoria!]!
    esFavorito: Boolean!
  }

  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: RolUsuario!
    activo: Boolean!
    pedidos: [Pedido!]!
  }

  type DetallePedido {
    id: ID!
    cantidad: Int!
    precio: Float!
    subtotal: Float!
    producto: Producto!
  }

  type Pedido {
    id: ID!
    numeroPedido: String!
    fecha: String!
    total: Float!
    status: EstadoPedido!
    usuario: Usuario
    detalles: [DetallePedido!]!
    pago: Pago
    factura: Factura
    nombreReceptor: String
    calle: String
    numeroExterior: String
    numeroInterior: String
    colonia: String
    ciudad: String
    estado: String
    codigoPostal: String
    referencias: String
    notas: String
  }

  type Pago {
    id: ID!
    pedido: Pedido!
    proveedor: ProveedorPago!
    referenciaExterna: String
    monto: Float!
    estado: String!
    fecha: String!
  }

  type Factura {
    id: ID!
    pedido: Pedido!
    folio: String
    estado: String!
    xml: String
    fecha: String!
  }

  type DashboardResumen {
    productos: Int!
    categorias: Int!
    usuarios: Int!
    pedidos: Int!
    pedidosPendientes: Int!
    pedidosPagados: Int!
    stockBajo: Int!
    ventas: Float!
  }

  type LoginResult {
    ok: Boolean!
    mensaje: String!
    usuario: Usuario
    token: String
  }

  input ProductoInput {
    nombre: String!
    descripcion: String
    precio: Float!
    imagen: String
    stock: Int!
    categoriaId: ID!
    categoriaIds: [ID!]
    activo: Boolean
  }

  input ActualizarProductoInput {
    nombre: String
    descripcion: String
    precio: Float
    imagen: String
    stock: Int
    categoriaId: ID
    categoriaIds: [ID!]
    activo: Boolean
  }

  input CategoriaInput {
    nombre: String!
    activo: Boolean
  }

  input DireccionPedidoInput {
    nombreReceptor: String!
    calle: String!
    numeroExterior: String!
    numeroInterior: String
    colonia: String!
    ciudad: String!
    estado: String!
    codigoPostal: String!
    referencias: String
    notas: String
  }

  input DetallePedidoInput {
    productoId: ID!
    cantidad: Int!
  }

  input CrearPedidoInput {
    detalles: [DetallePedidoInput!]!
    proveedorPago: ProveedorPago!
    direccion: DireccionPedidoInput!
  }

  input RegistrarUsuarioInput {
    nombre: String!
    email: String!
    password: String!
  }
  
  type PreferenciaMercadoPago {
   id: ID!
   url: String!
   sandboxUrl: String!
  }

  type OrdenPayPal {
  id: ID!
  }

  input TarjetaIntegradaInput {
    token: String!
    paymentMethodId: String!
    issuerId: String
    installments: Int!
    email: String!
    identificationType: String
    identificationNumber: String
  }

  type ResultadoPagoIntegrado {
    estado: String!
    mensaje: String!
    pagoId: ID
    pedido: Pedido!
  }
 
  enum TipoEventoBackoffice {
    PEDIDO
    PRODUCTO
    CATEGORIA
    PAGO
    USUARIO
    FACTURA
  }

  type EventoBackoffice {
    tipo: TipoEventoBackoffice!
    entidadId: ID!
    operacion: String!
    fecha: String!
  }

  type Subscription {
  eventoBackoffice: EventoBackoffice!
  catalogoActualizado: Boolean!
  }

  type Query {
    categorias(incluirInactivas: Boolean = false): [Categoria!]!
    categoria(id: ID!): Categoria
    productos(busqueda: String, categoriaId: ID, incluirInactivos: Boolean = false, limite: Int = 50, desde: Int = 0): [Producto!]!
    producto(id: ID!): Producto
    pedidos: [Pedido!]!
    misPedidos: [Pedido!]!
    usuarios(
      busqueda: String
      rol: RolUsuario
      activo: Boolean
    ): 
    [Usuario!]!
    pagos: [Pago!]!
    facturas: [Factura!]!
    pagosRecientes: [Pago!]!
    dashboard: DashboardResumen!
    misFavoritos: [Producto!]!
  }

  type Mutation {
    login(email: String!, password: String!): LoginResult!
    registrarUsuario(datos: RegistrarUsuarioInput!): LoginResult!
    solicitarRecuperacionPassword(email: String!): Boolean!
    restablecerPassword(token: String!, nuevaPassword: String!): Boolean!
    crearProducto(datos: ProductoInput!): Producto!
    actualizarProducto(id: ID!, datos: ActualizarProductoInput!): Producto
    eliminarProducto(id: ID!): Boolean!
    crearCategoria(datos: CategoriaInput!): Categoria!
    actualizarCategoria(id: ID!, datos: CategoriaInput!): Categoria
    eliminarCategoria(id: ID!): Boolean!
    ajustarStock(id: ID!, stock: Int!): Producto
    registrarPedido(datos: CrearPedidoInput!): Pedido!
    crearPreferenciaMercadoPago(pedidoId: ID!): PreferenciaMercadoPago!
    confirmarPagoMercadoPago(pedidoId: ID!, pagoId: ID!): Pedido!
    crearOrdenPayPal(pedidoId: ID!): OrdenPayPal!
    cobrarTarjetaMercadoPago( pedidoId: ID!, datos: TarjetaIntegradaInput!): ResultadoPagoIntegrado!
    consultarPagoMercadoPago( pedidoId: ID!,): ResultadoPagoIntegrado!
    capturarOrdenPayPal(pedidoId: ID!, paypalOrderId: ID!): Pedido!
    sincronizarPagoPayPal(pedidoId: ID!): Pedido!
    actualizarEstadoPedido(id: ID!, status: EstadoPedido!): Pedido
    actualizarEstadoPago(id: ID!, estado: String!): Pago
    prepararFactura(pedidoId: ID!): Factura!
    actualizarUsuario(id: ID!, rol: RolUsuario, activo: Boolean): Usuario
    alternarFavorito(productoId: ID!): Boolean!
  }
`
