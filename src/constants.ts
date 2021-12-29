import { FormFactor } from './types'
export const minViewportWidths: { [formFactor in FormFactor ]: number } = {
    'mobile': 0,
    'tablet': 1024,
    'desktop': 1280
}