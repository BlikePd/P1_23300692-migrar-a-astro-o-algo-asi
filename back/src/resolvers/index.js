import { subscriptionResolvers } from "./subscriptionResolvers.js"

import {
    authMutations
} from "./authResolvers.js"

import {
    categoryQueries,
    categoryMutations,
    categoryTypes
} from "./categoryResolvers.js"

import {
    productQueries,
    productMutations,
    productTypes
} from "./productResolvers.js"

import {
    orderQueries,
    orderMutations,
    orderTypes
} from "./orderResolvers.js"

import {
    userQueries,
    userMutations,
    userTypes
} from  "./userResolvers.js"

import {
    paymentQueries,
    paymentMutations,
    paymentTypes
} from "./paymentResolvers.js"

import {
    invoiceQueries,
    invoiceMutations,
    invoiceTypes
} from "./invoiceResolvers.js"

import {
    dashboardQueries
} from "./dashboardResolvers.js"

export const resolvers = {
    Query: {
        ...categoryQueries,
        ...productQueries,
        ...orderQueries,
        ...userQueries,
        ...paymentQueries,
        ...invoiceQueries,
        ...dashboardQueries
    },
    Mutation: {
        ...authMutations,
        ...categoryMutations,
        ...productMutations,
        ...orderMutations,
        ...userMutations,
        ...paymentMutations,
        ...invoiceMutations
    },
    Subscription: subscriptionResolvers,
    ...categoryTypes,
    ...productTypes,
    ...orderTypes,
    ...userTypes,
    ...paymentTypes,
    ...invoiceTypes
}