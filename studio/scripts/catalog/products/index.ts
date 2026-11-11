import type {ProductInput} from '../types'
import {cabinAirFilters} from './cabin-air-filters'
import {engineAirFilters} from './engine-air-filters'
import {fluids} from './fluids'
import {oil} from './oil'
import {oilFilters} from './oil-filters'
import {shopMisc} from './shop-misc'

export const products: ProductInput[] = [
  ...oil,
  ...fluids,
  ...oilFilters,
  ...cabinAirFilters,
  ...engineAirFilters,
  ...shopMisc,
]
