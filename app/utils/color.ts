export interface Rgb {
    r: number;
    g: number;
    b: number;
}

export interface Hsv {
    h: number;
    s: number;
    v: number;
}

export interface Rgba extends Rgb {
    a: number;
}

export function hsvToRgb(hue: number, saturation: number, value: number): Rgb {
    const chroma = value * saturation;
    const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = value - chroma;

    let red = 0;
    let green = 0;
    let blue = 0;

    if (hue < 60) [red, green, blue] = [chroma, secondary, 0];
    else if (hue < 120) [red, green, blue] = [secondary, chroma, 0];
    else if (hue < 180) [red, green, blue] = [0, chroma, secondary];
    else if (hue < 240) [red, green, blue] = [0, secondary, chroma];
    else if (hue < 300) [red, green, blue] = [secondary, 0, chroma];
    else [red, green, blue] = [chroma, 0, secondary];

    return {
        r: Math.round((red + offset) * 255),
        g: Math.round((green + offset) * 255),
        b: Math.round((blue + offset) * 255)
    };
}

export function rgbToHsv(red: number, green: number, blue: number): Hsv {
    const redUnit = red / 255;
    const greenUnit = green / 255;
    const blueUnit = blue / 255;

    const max = Math.max(redUnit, greenUnit, blueUnit);
    const min = Math.min(redUnit, greenUnit, blueUnit);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
        switch (max) {
            case redUnit:
                hue = (greenUnit - blueUnit) / delta + (greenUnit < blueUnit ? 6 : 0);
                break;
            case greenUnit:
                hue = (blueUnit - redUnit) / delta + 2;
                break;
            default:
                hue = (redUnit - greenUnit) / delta + 4;
        }
        hue /= 6;
    }

    return { h: hue * 360, s: max === 0 ? 0 : delta / max, v: max };
}

const HEX_REGEX = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;

/** Parses `#RRGGBB` or `#RRGGBBAA` (hash optional). Alpha is returned in 0..1. */
export function parseHex(text: string): Rgba | null {
    const match = HEX_REGEX.exec(text.trim());
    if (!match) {
        return null;
    }
    const rgb = parseInt(match[1], 16);
    return {
        r: (rgb >> 16) & 0xff,
        g: (rgb >> 8) & 0xff,
        b: rgb & 0xff,
        a: match[2] ? parseInt(match[2], 16) / 255 : 1
    };
}

/** `#RRGGBB`, or `#RRGGBBAA` when alpha (0..1) is below 1. Same format as `Color.hex`. */
export function formatHex(rgb: Rgb, alpha = 1): string {
    const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
    const result = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    return (alpha < 1 ? result + toHex(Math.round(alpha * 255)) : result).toUpperCase();
}
