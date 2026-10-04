import { createContext, useContext } from 'react'
export const BaseCtx = createContext('/malik')
export const useBase = () => useContext(BaseCtx)
