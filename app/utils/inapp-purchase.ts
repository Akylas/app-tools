import { BuyItemOptions, Item as InAppItem, InAppPurchase, PaymentEvent } from '@akylas/nativescript-inapp-purchase/index';
import { showBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
import { showError } from './showError';
import { lc } from '@nativescript-community/l';

let inappPurchase: InAppPurchase;
export let inappItems: InAppItem[];
export function init() {
    if (!inappPurchase) {
        inappPurchase = new InAppPurchase();
        const itemPrefix = __INAPP_PURCHASE_ID_PREFIX__ + __APP_ID__ + '.';
        inappPurchase.on(PaymentEvent.EventName, (event: PaymentEvent.IEvent) => {
            switch (event.context) {
                case PaymentEvent.Context.CONNECTING_STORE:
                    if (event.result === PaymentEvent.Result.SUCCESS) {
                        const canPay = inappPurchase.canMakePayments();
                        if (canPay) {
                            // pass in your product IDs here that you want to query for
                            inappPurchase.fetchItems([itemPrefix + 'smalltip', itemPrefix + 'mediumtip', itemPrefix + 'largetip', itemPrefix + 'largertip', itemPrefix + 'bigtip']);
                        }
                    } else if (event.result === PaymentEvent.Result.FAILURE) {
                        DEV_LOG && console.log('in_app_failure', (event as PaymentEvent.ConnectingStore.IFailure).payload.description);

                        // showError(new Error(lc('in_app_failure', (event as PaymentEvent.ConnectingStore.IFailure).payload.description)));
                    }
                    break;
                case PaymentEvent.Context.RETRIEVING_ITEMS:
                    if (event.result === PaymentEvent.Result.SUCCESS) {
                        // if you passed multiple items you will need to handle accordingly for your app
                        inappItems = (event as PaymentEvent.RetrievingItems.ISuccess).payload;
                        DEV_LOG && console.log('inappItems', inappItems);
                    } else if (event.result === PaymentEvent.Result.FAILURE) {
                        DEV_LOG && console.log('in_app_failure', (event as PaymentEvent.RetrievingItems.IFailure).payload.description);
                        // showError(new Error(lc('in_app_failure', (event as PaymentEvent.RetrievingItems.IFailure).payload.description)));
                    }
                    break;
                case PaymentEvent.Context.PROCESSING_ORDER:
                    if (event.result === PaymentEvent.Result.FAILURE) {
                        DEV_LOG && console.log('in_app_failure', (event as PaymentEvent.ProcessingOrder.IFailure).payload.description);
                        // showError(new Error(lc('in_app_failure', (event as PaymentEvent.ProcessingOrder.IFailure).payload.description)));
                        // handle the failure of the purchase
                    } else if (event.result === PaymentEvent.Result.SUCCESS) {
                        const payload = (event as PaymentEvent.ProcessingOrder.ISuccess).payload;
                        // handle the successful purchase
                        inappPurchase.finalizeOrder(payload);
                    }
                    break;
                case PaymentEvent.Context.FINALIZING_ORDER:
                    if (event.result === PaymentEvent.Result.SUCCESS) {
                        showThankYou().catch(showError);
                    } else if (event.result === PaymentEvent.Result.FAILURE) {
                        showError(new Error(lc('in_app_failure', (event as PaymentEvent.FinalizingOrder.IFailure).payload.description)));
                    }
                    break;
                case PaymentEvent.Context.RESTORING_ORDERS:
                    break;
                default:
                    break;
            }
        });
    }
    inappPurchase.init();
    return inappPurchase;
}

async function showThankYou() {
    const ThankYou = (await import('@shared/components/ThankYou.svelte')).default;
    return showBottomSheet({
        parent: null,
        skipCollapsedState: true,
        view: ThankYou,
        ignoreTopSafeArea: true,
        props: {}
    });
}

export async function presentInAppSponsorBottomsheet() {
    const OptionSelect = (await import('~/components/common/OptionSelect.svelte')).default;
    const options = inappItems
        .sort((a, b) => a.priceAmount - b.priceAmount)
        .map((i) => {
            const id = i.itemId.split('.').pop();
            return {
                data: i,
                title: lc(`inapp.${id}`),
                subtitle: lc(`inapp.${id}_desc`),
                rightValue: i.priceFormatted
            };
        });
    const rowHeight = 80;
    const height = Math.min(rowHeight * options.length, 400);
    const result = await showBottomSheet({
        parent: null,
        view: OptionSelect,
        peekHeight: 400,

        ignoreTopSafeArea: true,
        props: {
            fontWeight: 'normal',
            autoSizeListItem: true,
            showBorders: true,
            options,
            rowHeight,
            height
        }
    });
    if (result) {
        buySponsorItem(result.data);
    }
}

export function buySponsorItem(item: InAppItem) {
    const opts: BuyItemOptions = {
        // accountUserName: 'someuseraccount123@test.orgbizfree',
        android: {
            // vrPurchase: true
        },
        ios: {
            quantity: 1
            // simulatesAskToBuyInSandbox: true
        }
    };

    // This method will kick off the platform purchase flow
    // We are passing the item and an optional object with some configuration
    inappPurchase.buyItem(item, opts);
}
