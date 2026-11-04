'use strict';

( async ( window, document ) => {

window.chrome = ( ( typeof browser != 'undefined' ) && browser.runtime ) ? browser : chrome;

const
    DEBUG = false,
    SCRIPT_NAME = 'twOpenOriginalImage-options',
    DEFAULT_VALUES = window.twOpenOriginalImage_defaults;

const
    background_window = ( ( background_window ) => {
        if ( background_window ) {
            return background_window;
        }
        // Manifest V3 だとnull → 代替関数登録
        return {
            log_debug : function () {
                if ( ! DEBUG ) {
                    return;
                }
                const
                    arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
                console.log.apply( console, arg_list.concat( [ ... arguments ] ) );
            }, // end of log_debug()
            
            log_info : function () {
                const
                    arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
                console.info.apply( console, arg_list.concat( [ ... arguments ] ) );
            }, // end of log_info()
            
            log_warn : function () {
                const
                    arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
                console.warn.apply( console, arg_list.concat( [ ... arguments ] ) );
            }, // end of log_warn()
            
            log_error : function () {
                const
                    arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
                console.error.apply( console, arg_list.concat( [ ... arguments ] ) );
            }, // end of log_error()
        };
    } )( chrome.extension.getBackgroundPage() );

let
    applied_options = null,
    get_effective_options = null,
    test_event_type = 'unknown';

const
    send_message_to_background = async ( message, callback = null ) => {
        const
            response = await chrome.runtime.sendMessage( message );
        if ( typeof callback == 'function' ) {
            await callback( response );
        }
        return response;
    },
    request_reload_tabs = async () => {
        if ( DEBUG ) {
            const
                response = await send_message_to_background( {
                    type : `TEST-${document.visibilityState}-*** ${test_event_type} ***`,
                } );
            background_window.log_debug( response, '< RELOAD_TABS event done >' );
        }

        if ( ( applied_options === null ) || ( get_effective_options === null ) ) {
            return;
        }

        const
            current_options = JSON.stringify( await get_effective_options() );

        background_window.log_debug( '< unloaded > changed:', current_options !== applied_options );

        if ( current_options === applied_options ) {
            return;
        }

        applied_options = current_options;

        const
            response = await send_message_to_background( {
                type : 'RELOAD_TABS',
            } );
        background_window.log_debug( response, '< RELOAD_TABS event done >' );
    };


// Manifest V3のChromeだとunloadイベント内のsendMessage()ではService Workerにメッセージが届かない → visibilitychange/blurで代替
[ 'unload', 'blur', 'visibilitychange' ].forEach( ( event_type ) => window.addEventListener( event_type, async ( event ) => {
    if ( ( event.type == 'visibilitychange' ) && ( document.visibilityState != 'hidden' ) ) {
        return;
    }
    test_event_type = event.type;
    await request_reload_tabs();
} ) );

const on_ready = ( callback ) => {
    if ( document.readyState == 'loading' ) {
        document.addEventListener( 'DOMContentLoaded', callback, { once : true } );
    }
    else {
        callback();
    }
};

on_ready( async () => {
    const
        RADIO_KV_LIST = Object.keys( DEFAULT_VALUES )
            .filter( ( key ) => key !== 'OPERATION' )
            .map( ( key ) => ( { key, val : DEFAULT_VALUES[ key ] } ) ),
        STR_KV_LIST = [
            { key : 'BUTTON_TEXT' },
        ],
        OPTION_KEY_LIST = [ ...RADIO_KV_LIST, ...STR_KV_LIST ].map( ( kv ) => kv.key ).concat( 'OPERATION' );
    
    STR_KV_LIST.forEach( ( str_kv ) => {
        str_kv.val = chrome.i18n.getMessage( str_kv.key );
    } );
    
    document.querySelectorAll( '.i18n' ).forEach( ( elm ) => {
        const
            value = ( elm.value ) || ( elm.textContent );

        let
            text = chrome.i18n.getMessage( value );

        if ( ! text ) {
            return;
        }
        if ( ( value == 'OPTIONS' ) && ( elm.parentElement?.tagName == 'H1' ) ) {
            text += ` ( version ${chrome.runtime.getManifest().version} )`;
        }
        if ( elm.value ) {
            elm.value = text;
        }
        else {
            elm.textContent = text;
        }
    } );

    document.querySelectorAll( 'form' ).forEach( ( form ) => {
        form.addEventListener( 'submit', ( event ) => event.preventDefault() );
    } );
    
    const
        get_bool = ( value, default_value = null ) => {
            if ( value === undefined ) {
                return default_value;
            }
            if ( ( value === '0' ) || ( value === 0 ) || ( value === false ) || ( value === 'false' ) ) {
                return false;
            }
            if ( ( value === '1' ) || ( value === 1 ) || ( value === true ) || ( value === 'true' ) ) {
                return true;
            }
            return default_value;
        }, // end of get_bool()
        
        set_values = async ( name_value_map, callback = null ) => {
            await chrome.storage.local.set( name_value_map );
            if ( typeof callback == 'function' ) {
                await callback();
            }
        }, // end of set_values()
        
        get_values = async ( name_list, callback = null ) => {
            if ( typeof name_list == 'string' ) {
                name_list = [ name_list ];
            }
            const
                name_value_map = await chrome.storage.local.get( name_list );
            if ( typeof callback == 'function' ) {
                await callback( name_value_map );
            }
            return name_value_map;
        }, // end of get_values()
        
        remove_values = async ( key_list ) => {
            await chrome.storage.local.remove( key_list );
        }, // end of remove_values()
        
        get_value = async ( key ) => {
            const
                items = await get_values( [ key ] );
            return items[ key ];
        }, // end of get_value()
        
        set_value = async ( key, value ) => {
            await set_values( {
                [ key ] : value
            });
        }, // end of set_value()
        
        remove_value = async ( key ) => {
            await remove_values( [ key ] );
        }, // end of remove_value()
        
        reset_context_menu = async ( callback ) => {
            background_window.log_debug( 'reset_context_menu: begin' );
            const
                response = await send_message_to_background( {
                    type : 'RESET_CONTEXT_MENU'
                } );
            if ( typeof callback == 'function' ) {
                await callback( response );
            }
            background_window.log_debug( 'reset_context_menu: end', response );
        }, // end of reset_context_menu()

        bind_text_option = ( key, svalue, check_svalue ) => {
            const
                target = document.getElementById( key ),
                input = target?.querySelector( 'input[type="text"]' ),
                current = target?.querySelector( 'span.current' ),
                show_value = ( value ) => {
                    if ( current ) {
                        current.textContent = value;
                    }
                    if ( input ) {
                        input.value = value;
                    }
                };

            show_value( svalue );

            target?.querySelectorAll( 'input[type="button"]' ).forEach( ( button ) => {
                button.onclick = async () => {
                    const
                        next_value = check_svalue( input?.value );

                    await set_value( key, next_value );
                    show_value( next_value );
                };
            } );
        }, // end of bind_text_option()
        
        set_radio_evt = async ( kv ) => {
            const
                check_svalue = ( kv, svalue ) => {
                    const
                        bool_value = get_bool( svalue );
                    
                    if ( bool_value === null ) {
                        return check_svalue( kv, kv.val );
                    }
                    return ( bool_value ) ? '1' : '0';
                },
                key = kv.key,
                svalue = check_svalue( kv, await get_value( key ) ),
                target = document.getElementById( key ),
                inputs = target?.querySelectorAll( `input[type="radio"][name="${key}"]` ) ?? [];

            inputs.forEach( ( input ) => {
                input.checked = ( input.value === svalue );
                input.onchange = async () => {
                    await set_value( key, check_svalue( kv, input.value ) );
                };
            } );
        }, // end of set_radio_evt()
        
        set_str_evt = async ( kv ) => {
            const
                check_svalue = ( kv, svalue ) => {
                    if ( ! svalue ) {
                        svalue = kv.val;
                    }
                    else {
                        svalue = String( svalue ).replace( /(?:^\s+|\s+$)/g, '' );
                        if ( ! svalue ) {
                            svalue = kv.val;
                        }
                    }
                    return svalue;
                },
                key = kv.key,
                svalue = check_svalue( kv, await get_value( key ) );

            bind_text_option( key, svalue, ( input_value ) => check_svalue( kv, input_value ) );
        }, // end of set_str_evt()

        set_operation_evt = async () => {
            const
                operation_buttons = document.querySelectorAll( 'input[name="OPERATION"]' );
            
            let
                operation = get_bool( await get_value( 'OPERATION' ) );
            
            operation = ( operation === null ) ? DEFAULT_VALUES.OPERATION : operation;

            const
                set_operation = async ( next_operation ) => {
                    const
                        button_text = ( next_operation ) ? ( chrome.i18n.getMessage( 'STOP' ) ) : ( chrome.i18n.getMessage( 'START' ) ),
                        icon_path = ( next_operation ) ? '../img/icon_48.png' : '../img/icon_48-gray.png';
                    
                    operation_buttons.forEach( ( button ) => {
                        button.value = button_text;
                    } );
                    ( chrome.action || chrome.browserAction ).setIcon( { path : icon_path } );
                    
                    await set_value( 'OPERATION', next_operation );
                    operation = next_operation;
                };
            
            operation_buttons.forEach( ( button ) => {
                button.onclick = async () => {
                    await set_operation( ! operation );
                    await reset_context_menu();
                };
            } );
            
            await set_operation( operation );
        }, // end of set_operation_evt()
        
        set_all_evt = async () => {
            for ( let radio_kv of RADIO_KV_LIST ) {
                await set_radio_evt( radio_kv );
            }

            for ( let str_kv of STR_KV_LIST ) {
                await set_str_evt( str_kv );
            }
            
            await set_operation_evt();
            await reset_context_menu();
        };   //  end of set_all_evt()
    
    await set_all_evt();

    get_effective_options = async () => {
        const
            stored = await get_values( OPTION_KEY_LIST );

        return Object.fromEntries( [
            ...RADIO_KV_LIST.map( ( kv ) => [ kv.key, get_bool( stored[ kv.key ], kv.val ) ] ),
            ...STR_KV_LIST.map( ( kv ) => [ kv.key, String( stored[ kv.key ] ?? '' ).trim() || kv.val ] ),
            [ 'OPERATION', get_bool( stored.OPERATION, DEFAULT_VALUES.OPERATION ) ],
        ] );
    };
    applied_options = JSON.stringify( await get_effective_options() );

    document.querySelectorAll( 'input[name="DEFAULT"]' ).forEach( ( button ) => {
        button.addEventListener( 'click', async () => {
            await remove_values( OPTION_KEY_LIST );
            await set_all_evt();
        } );
    } );
} );

} )( window, document );

// ■ end of file
