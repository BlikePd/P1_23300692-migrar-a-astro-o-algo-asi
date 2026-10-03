# Arquitectura actual

```text
                     QUEST MERCHANT

             CLIENTE WEB       ADMIN WEB
                  \               /
                   \             /
                    React + Vite
                         |
                    Apollo Client
                         |
                       GraphQL
                         |
                    Apollo Server
                         |
                     PostgreSQL
          _____________|_______________
         |        |        |       |    |
      Catálogo  Pedidos  Pagos  Facturas Usuarios
```

# Integraciones preparadas para la siguiente etapa

```text
Apollo Server
   |
   |-- REST ---------- PayPal
   |               \-- Mercado Pago
   |
   |-- SOAP/XML ------ Facturación
   |
   |-- MCP ----------- Asistente IA
   |
   |-- gRPC ---------- App móvil
   |
   \-- REST ---------- Servicio IA / Spring
```

En esta entrega, GraphQL y PostgreSQL sí funcionan como núcleo del sistema. Las secciones de pagos y facturación ya tienen tablas, consultas y flujo administrativo local, pero las llamadas externas REST/SOAP todavía están marcadas como pendientes para no fingir integraciones que aún no existen.
