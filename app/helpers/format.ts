import { getCurrentLocale } from '@shared/helpers/lang';

export function formatCurrency(value, locale) {
    if (__IOS__) {
        const formatter = NSNumberFormatter.alloc().init();
        formatter.currencyCode = locale;
        formatter.numberStyle = NSNumberFormatterStyle.CurrencyStyle;
        return formatter.stringFromNumber(value);
    } else {
        const nLocal = java.util.Locale.forLanguageTag(locale) || (getCurrentLocale() as java.util.Locale);
        const defaultCurrencyFormatter = java.text.NumberFormat.getCurrencyInstance(nLocal);
        return defaultCurrencyFormatter.format(value);
    }
}
