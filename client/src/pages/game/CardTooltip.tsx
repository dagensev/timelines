import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface Props {
    anchorRect: DOMRect;
    title: string;
    description: string;
    year?: number;
}

// Tooltip is 20% larger than the card in both axes
const SCALE_UP = 1.2;

export function CardTooltip({ anchorRect, title, description, year }: Props) {
    const tooltipWidth  = Math.round(anchorRect.width  * SCALE_UP);
    const minHeight     = Math.round(anchorRect.height * SCALE_UP);

    // Center the (larger) tooltip over the card
    const left = Math.max(8, Math.min(
        anchorRect.left - (tooltipWidth - anchorRect.width) / 2,
        window.innerWidth - tooltipWidth - 8,
    ));
    const top = anchorRect.top - (minHeight - anchorRect.height) / 2;

    // All internal dimensions scale from the tooltip width, same formula as TimelineCard
    const s = tooltipWidth / 400;
    const outerPad     = Math.round(14 * s);
    const outerRadius  = Math.round(30 * s);
    const innerRadius  = Math.round(18 * s);
    const innerPadTop  = Math.round(70 * s);
    const innerPadSide = Math.round(24 * s);
    const brandSize    = Math.round(30 * s);
    const brandGap     = Math.round(32 * s);
    const descSize     = Math.round(20 * s);
    const yearSize     = Math.round(88 * s);
    const footerHeight       = Math.round(minHeight * 0.33);
    const innerPanelMinHeight = minHeight - outerPad - footerHeight;

    const content = (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top,
                left,
                width: tooltipWidth,
                minHeight,
                zIndex: 1000,
                pointerEvents: 'none',
                borderRadius: outerRadius,
                background: '#1a1a1a',
                border: '1.5px solid #3a3a3a',
                boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: outerPad,
                paddingLeft: outerPad,
                paddingRight: outerPad,
                paddingBottom: 0,
            }}
        >
            {/* Parchment panel — no fixed height, grows to fit full description */}
            <div
                style={{
                    borderRadius: innerRadius,
                    background: '#e8e0d0',
                    border: '1px solid #c8bfb0',
                    paddingTop: innerPadTop,
                    paddingLeft: innerPadSide,
                    paddingRight: innerPadSide,
                    paddingBottom: innerPadSide,
                    minHeight: innerPanelMinHeight,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <p style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: brandSize,
                    fontWeight: 700,
                    color: '#1a1a1a',
                    textAlign: 'center',
                    lineHeight: 1,
                    margin: 0,
                    marginBottom: brandGap,
                    flexShrink: 0,
                }}>
                    Timelines
                </p>
                <p style={{
                    fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                    fontSize: descSize,
                    fontWeight: 400,
                    color: '#2a2420',
                    lineHeight: 1.55,
                    textAlign: 'center',
                    margin: 0,
                    // No overflow, no clamp, no flex constraints — fully unrestricted
                }}>
                    {description || title}
                </p>
            </div>

            {/* Year footer */}
            <div style={{
                height: footerHeight,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <span style={{
                    fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                    fontSize: yearSize,
                    fontWeight: 700,
                    color: year !== undefined ? '#f0ede6' : '#3a3a3a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                }}>
                    {year !== undefined ? year : '????'}
                </span>
            </div>
        </motion.div>
    );

    return createPortal(content, document.body);
}
