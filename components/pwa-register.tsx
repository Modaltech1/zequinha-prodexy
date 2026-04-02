// components/pwa-register.tsx
'use client'

import { useEffect } from 'react'

export function PWARegister() {
    useEffect(() => {
        // só registra em produção
        if (process.env.NODE_ENV !== 'production') return

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .catch((err) => {
                    console.error('Falha ao registrar o Service Worker', err)
                })
        }
    }, [])

    // não renderiza nada na tela
    return null
}
