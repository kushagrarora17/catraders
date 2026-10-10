import type {ProductInput} from '../types'
import {products as cabinAirFilters} from './cabin-air-filters'
import {products as engineAirFilters} from './engine-air-filters'
import {products as fluids} from './fluids'
import {products as oil} from './oil'
import {products as oilFilters} from './oil-filters'
import {products as shopMisc} from './shop-misc'

export const products: ProductInput[] = [
  ...oil,
  ...fluids,
  ...oilFilters,
  ...cabinAirFilters,
  ...engineAirFilters,
  ...shopMisc,
]
