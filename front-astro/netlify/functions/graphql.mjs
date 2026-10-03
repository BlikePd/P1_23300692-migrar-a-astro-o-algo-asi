import { handleGraphQLRequest } from "../../../back/src/netlify-handler.js"

export default handleGraphQLRequest

export const config = {
  path: "/graphql"
}
