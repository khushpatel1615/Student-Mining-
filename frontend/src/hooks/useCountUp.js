import { useEffect, useState } from 'react'

/**
 * Custom hook for animated number counter
 * @param {number} end - The target number to count to
 * @param {number} duration - Duration of animation in milliseconds (default: 1000)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {number} - Current count value
 */
export const useCountUp = (end, duration = 1000, decimals = 0) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (typeof end !== 'number' || isNaN(end)) {
            setCount(0)
            return
        }

        let startTime
        let animationFrame

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const currentCount = easeOutQuart * end

            setCount(Number(currentCount.toFixed(decimals)))

            if (progress < 1) {
                animationFrame = window.requestAnimationFrame(step)
            }
        }

        animationFrame = window.requestAnimationFrame(step)

        return () => {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame)
            }
        }
    }, [end, duration, decimals])

    return count
}
