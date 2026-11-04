'use strict';

import { DEFAULT_OPTIONS as DEFAULT_VALUES } from './defaults.ts';

( async ( window, document ) => {

window.chrome = ( ( typeof browser != 'undefined' ) && browser.runtime ) ? browser : chrome;

const
    DEBUG = false,

    SCRIPT_NAME = 'twOpenOriginalImage',
    DOWNLOAD_MENU_ID = 'download_image';

const
    log_debug = function () {
        if ( ! DEBUG ) {
            return;
        }
        const
            arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
        console.log.apply( console, arg_list.concat( [ ... arguments ] ) );
    }, // end of log_debug()
    
    log_info = function () {
        const
            arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
        console.info.apply( console, arg_list.concat( [ ... arguments ] ) );
    }, // end of log_info()
    
    log_warn = function () {
        const
            arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
        console.warn.apply( console, arg_list.concat( [ ... arguments ] ) );
    }, // end of log_warn()
    
    log_error = function () {
        const
            arg_list = [ '[' + SCRIPT_NAME + ']', '(' + ( new Date().toISOString() ) + ')' ];
        console.error.apply( console, arg_list.concat( [ ... arguments ] ) );
    }, // end of log_error()

    is_twitter_page = ( () => {
        const
            reg = /https?:\/\/(((mobile|tweetdeck)\.)?(?:x|twitter)\.com|pbs\.twimg\.com)\//;
        return ( url ) => {
            if ( ! url ) {
                return false;
            }
            return reg.test( url );
        };
    } )(), // end of is_twitter_page()
    
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
        } );
    }, // end of set_value()
    
    remove_value = async ( key ) => {
        await remove_values( [ key ] );
    }; // end of remove_value()

// [覚書] Service Workerのグローバル変数は無効化するとリセットされてしまうため、storageに保存する必要あり
let
    CONTEXT_MENU_INITIALIZED = await get_value( 'CONTEXT_MENU_INITIALIZED' ) ?? false,

    CONTEXT_MENU_IS_SUSPENDED = await get_value( 'CONTEXT_MENU_IS_SUSPENDED' ) ?? false,
    SUPPRESS_FILENAME_SUFFIX = get_bool( await get_value( 'SUPPRESS_FILENAME_SUFFIX' ), DEFAULT_VALUES.SUPPRESS_FILENAME_SUFFIX ),
    SAME_FILENAME_AS_IN_ZIP = get_bool( await get_value( 'SAME_FILENAME_AS_IN_ZIP' ), DEFAULT_VALUES.SAME_FILENAME_AS_IN_ZIP ),
    
    CONTENT_TAB_INFOS = await get_value( 'CONTENT_TAB_INFOS' ) ?? {};

const
    update_context_menu_flags = async () => {
        const
            operation = get_bool( await get_value( 'OPERATION' ), DEFAULT_VALUES.OPERATION );

        CONTEXT_MENU_IS_SUSPENDED = ! operation; await set_value( 'CONTEXT_MENU_IS_SUSPENDED', CONTEXT_MENU_IS_SUSPENDED );
        
        SUPPRESS_FILENAME_SUFFIX = get_bool( await get_value( 'SUPPRESS_FILENAME_SUFFIX' ), DEFAULT_VALUES.SUPPRESS_FILENAME_SUFFIX );
        SAME_FILENAME_AS_IN_ZIP = get_bool( await get_value( 'SAME_FILENAME_AS_IN_ZIP' ), DEFAULT_VALUES.SAME_FILENAME_AS_IN_ZIP );
        log_debug( 'CONTEXT_MENU_IS_SUSPENDED:', CONTEXT_MENU_IS_SUSPENDED );
        log_debug( 'SUPPRESS_FILENAME_SUFFIX:', SUPPRESS_FILENAME_SUFFIX );
        log_debug( 'SAME_FILENAME_AS_IN_ZIP:', SAME_FILENAME_AS_IN_ZIP );
    }, // end of update_context_menu_flags()

    // [注意] url は https?:// 以外（画像ファイル名など）の場合あり（※その場合はnew URL(url)とするとエラー発生）
    get_url_info = ( url ) => {
        const
            url_parts = url.split( '?' ),
            query_map = {},
            url_info = { base_url : url_parts[ 0 ], query_map : query_map };
        
        if ( url_parts.length < 2 ) {
            return url_info;
        }
        
        url_parts[ 1 ].split( '&' ).forEach( ( query_part ) => {
            var parts = query_part.split( '=' );
            
            query_map[ parts[ 0 ] ] = ( parts.length < 2 ) ? '' : parts[ 1 ];
        } );
        
        return url_info;
    }, // end of get_url_info()
    
    normalize_img_url = ( source_url ) => {
        const
            url_info = get_url_info( source_url ),
            [ , base_url, format = url_info.query_map.format ] = url_info.base_url.match( /^(.*?)(?:\.(\w+))?$/ ),
            name = url_info.query_map.name;

        if ( ! format ) {
            return source_url;
        }
        return `${base_url}.${format}${name ? ':' + name : ''}`;
    }, // end of normalize_img_url()
    
    get_formatted_img_url = ( () => {
        const
            reg_normalized_image_url = /^(.+)\.([^.:]+):?((?:[^:]+)?)$/;
        
        return ( normalized_img_url ) => {
            const
                formatted_img_url = ( normalized_img_url.match( reg_normalized_image_url ) )
                    ? `${RegExp.$1}?format=${RegExp.$2}${RegExp.$3 ? '&name=' + RegExp.$3 : ''}`
                    : normalized_img_url;
            //log_debug( 'formatted_img_url=', formatted_img_url, normalized_img_url );
            return formatted_img_url;
        };
    } )(), // end of get_formatted_img_url()
    
    replace_image_format = ( () => {
        const
            reg_format = /([?&]format=)([^&]+)/,
            reg_normalized_image_url = /^(.+)\.([^.:]+):?((?:[^:]+)?)$/;
        
        return ( normalized_img_url, spec_format = 'jpg' ) => {
            if ( reg_format.test( normalized_img_url ) ) {
                return normalized_img_url.replace( reg_format, `$1${spec_format}` );
            }
            else if ( normalized_img_url.match( reg_normalized_image_url ) ) {
                const
                    base_url = RegExp.$1,
                    format = RegExp.$2,
                    name = RegExp.$3;
                return `${base_url}.${spec_format}${name ? ':' + name : ''}`;
            }
            return normalized_img_url;
        };
    } )(), // end of replace_image_format()
    
    get_filename_from_image_url = ( () => {
        const
            reg_name_suffix = /:\w*$/,
            reg_normalized_image_url = /^.+\/([^\/.]+)\.(\w+):(\w+)$/,
            reg_link_url = /^https?:\/\/(?:mobile\.)?(?:x|twitter)\.com\/([^\/]+)\/status(?:es)?\/(\d+)\/photo\/(\d+).*$/;
            
        return ( img_url, link_url ) => {
            if ( ! reg_name_suffix.test( img_url ) ) {
                return null;
            }
            if ( ! img_url.match( reg_normalized_image_url ) ) {
                return img_url;
            }
            
            const
                base = RegExp.$1,
                ext = RegExp.$2,
                suffix = RegExp.$3;
            
            if ( SAME_FILENAME_AS_IN_ZIP && link_url ) {
                var base_from_link_url = link_url.replace( reg_link_url, '$1-$2-img$3' );
                if ( base_from_link_url != link_url ) {
                    return `${base_from_link_url}.${ext}`;
                }
            }
            if ( SUPPRESS_FILENAME_SUFFIX ) {
                return `${base}.${ext}`;
            }
            else {
                return `${base}-${suffix}.${ext}`;
            }
        };
    } )(), // end of get_filename_from_image_url()
    
    get_extension_from_image_url = ( () => {
        const
            reg_name_suffix = /:\w*$/,
            reg_normalized_image_url = /^.+\/([^\/.]+)\.(\w+):(\w+)$/;
        
        return ( img_url ) => {
            if ( ! reg_name_suffix.test( img_url ) ) {
                return null;
            }
            
            if ( ! img_url.match( reg_normalized_image_url ) ) {
                return null;
            }
            
            const
                ext = RegExp.$2;
            return ext;
        };
    } )(), // end of get_extension_from_image_url()
    
    reload_tabs = ( () => {
        const
            reg_host = /([^.]+\.)?(?:x|twitter)\.com/,
            
            reload_tab = async ( tab_info ) => {
                log_debug( 'reload_tab():', tab_info );
                const
                    tab_id = tab_info.tab_id;
                
                try {
                    const
                        response = await chrome.tabs.sendMessage( tab_id, {
                            type : 'RELOAD_REQUEST',
                        } );
                    log_debug( 'response', response );
                }
                catch ( error ) {
                    // タブが存在しないか、応答が無ければ chrome.runtime.lastError 発生→タブ情報を削除
                    // ※chrome.runtime.lastErrorをチェックしないときは Console に "Unchecked runtime.lastError: No tab with id: xxxx." 表示
                    delete CONTENT_TAB_INFOS[ tab_id ];
                    log_debug( 'tab or content_script does not exist: tab_id=', tab_id, '=> removed:', tab_info, '=> remained:', CONTENT_TAB_INFOS );
                }
            };
        
        return async () => {
            log_debug( 'reload_tabs():', CONTENT_TAB_INFOS );
            for ( const tab_info of Object.values( CONTENT_TAB_INFOS ) ) {
                log_debug( tab_info );
                
                try {
                    if ( ! reg_host.test( new URL( tab_info.url ).host ) ) {
                        continue;
                    }
                }
                catch ( error ) {
                    continue;
                }
                await reload_tab( tab_info );
            }
            await set_value( 'CONTENT_TAB_INFOS', CONTENT_TAB_INFOS );
        };
    } )(),
    
    download_image = ( () => {
        const
            reg_name_suffix = /:\w*$/;
            
        return async ( info, tab ) => {
            log_debug( '*** download_image(): info=', info, 'tab=', tab );
            const
                img_url = normalize_img_url( info.srcUrl ),
                link_url = info.linkUrl,
                frame_id = info.frameId,
                page_url = info.frameUrl || info.pageUrl,
                {
                    img_url_orig,
                    filename,
                } = await ( async () => {
                    const
                        is_valid_image = async ( img_url ) => {
                            const
                                response = await fetch( img_url );
                            return response.ok;
                        };
                    
                    let
                        img_url_orig = `${img_url.replace( reg_name_suffix, '' )}:orig`;
                    
                    if ( ! await is_valid_image( img_url_orig ) ) {
                        for ( const format of [ 'jpg', 'png', 'gif', 'webp', ] ) {
                            const
                                test_img_url = replace_image_format( img_url_orig, format );
                            if ( test_img_url == img_url_orig ) {
                                continue;
                            }
                            if ( await is_valid_image( test_img_url ) ) {
                                img_url_orig = test_img_url;
                                break;
                            }
                        }
                    }
                    return {
                        img_url_orig : get_formatted_img_url( img_url_orig ),
                        filename : get_filename_from_image_url( img_url_orig, link_url ),
                    };
                } )(),
                do_download = async () => {
                    // 覚書：「Download with Free Download Manager (FDM)」等を使っていると、ここで指定したファイル名が無視される
                    await chrome.downloads.download( {
                        url : img_url_orig,
                        filename : filename
                    } );
                };
            
            log_debug( `*** download_image(): img_url=${img_url}, img_url_orig=${img_url_orig}, filename=${filename}` );
            
            if ( tab && tab.id && is_twitter_page( page_url ) ) {
                const
                    message = {
                        type : 'DOWNLOAD_IMAGE_REQUEST',
                        img_url : img_url,
                        img_url_orig : img_url_orig,
                        filename : filename,
                    },
                    options = {
                        frameId : frame_id,
                    };
                
                try {
                    const
                        response = await chrome.tabs.sendMessage( tab.id, message, options );
                    
                    log_debug( '*** download_image(): response', response );
                    if ( ( ! response ) || ( response.result != 'OK' ) ) {
                        await do_download();
                    }
                }
                catch ( error ) {
                    log_error( error );
                    await do_download();
                }
            }
            else {
                await do_download();
            }
        };
    } )(), // end of download_image()
    
    on_determining_filename = async ( downloadItem, suggest ) => {
        await update_context_menu_flags();
        
        if ( CONTEXT_MENU_IS_SUSPENDED ) {
            return true;
        }
        if ( downloadItem.byExtensionId != chrome.runtime.id ) {
            // 本拡張機能以外から保存した場合は無視
            // ※この判定を無効化すれば、コンテキストメニューから「名前を付けて画像を保存」した場合も、http://～/xxx.jpg:kind → xxx-kind.jpg に変換される
            return true;
        }
        const
            url = normalize_img_url( downloadItem.finalUrl || downloadItem.url );
        
        if ( ! /^https?:\/\/pbs\.twimg\.com\/media\/[^:]+:\w*$/.test( url ) ) {
            return true;
        }
        
        suggest( {
            filename : get_filename_from_image_url( url )
        } );
        return true;
    }, // end of on_determining_filename()

    initialize = ( () => {
        const
            create_context_menu = async ( create_properties ) => {
                return await chrome.contextMenus.create( create_properties );
            },
            update_context_menu = async ( menu_id, update_properties ) => {
                return await chrome.contextMenus.update( menu_id, update_properties );
            },
            remove_context_menu = async ( menu_id ) => {
                //return await chrome.contextMenus.remove( menu_id ); // [TODO] ←こちらだと「Unchecked runtime.lastError: Cannot find menu item with id download_image」が出てしまう（コンテキスト「不明」・スタック トレース「:0（無名関数）」・表示する通知はありません。続行してください。）、try {} catch () {} で囲ってもダメ
                return await chrome.contextMenus.removeAll();
            };
            
        return async ( eventname, force_init_flag = false ) => {
            log_debug( '*** initialize():', eventname );

            await update_context_menu_flags();
            
            if ( force_init_flag ) {
                CONTEXT_MENU_INITIALIZED = false; await set_value( 'CONTEXT_MENU_INITIALIZED', CONTEXT_MENU_INITIALIZED );
            }
            
            const
                title = chrome.i18n.getMessage( 'DOWNLOAD_ORIGINAL_IMAGE' ) + ( CONTEXT_MENU_IS_SUSPENDED ? `[${chrome.i18n.getMessage( 'UNDER_SUSPENSION' )}]` : '');
            
            if ( CONTEXT_MENU_INITIALIZED ) {
                try {
                    await update_context_menu( DOWNLOAD_MENU_ID, {
                        title : title
                    } );
                    log_debug( '*** initialize(): rename title of context-menu to ', title );
                    return;
                }
                catch ( error ) {
                    log_error( '*** context menu could not undated' );
                }
            }

            try {
                await remove_context_menu( DOWNLOAD_MENU_ID );
                log_debug( '*** removed existing context menu ***' );
            }
            catch ( error ) {
            }
            
            try {
                await create_context_menu( {
                    type : 'normal'
                ,   id : DOWNLOAD_MENU_ID
                ,   title : title
                ,   contexts : [ 'image' ]
                ,   targetUrlPatterns : [ '*://pbs.twimg.com/media/*' ]
                } );
                log_debug( '*** created context menu ***' );
            }
            catch ( error ) {
                log_error( 'error in create_context_menu()', error );
            }
            CONTEXT_MENU_INITIALIZED = true; await set_value( 'CONTEXT_MENU_INITIALIZED', CONTEXT_MENU_INITIALIZED );
            log_debug( '*** initialize(): completed' );
        }
    } )(), // end of initialize()
    
    request_tab_sorting = ( () => {
        const
            sort_index_to_tab_id_map_map = {},
            callback_map = {},
            
            get_tab_index = async ( tab_id ) => {
                const
                    tab = await chrome.tabs.get( tab_id );
                return tab.index;
            },
            
            move_tab_to_index = async ( tab_id, tab_index ) => {
                const
                    tab = await chrome.tabs.move( tab_id, {
                        index : tab_index,
                    } );
                return tab;
            },
            
            sort_tabs = async ( request_id, sorted_tab_id_list, sorted_tab_index_list ) => {
                const
                    tab_list = await Promise.all( sorted_tab_id_list.map( ( tab_id, index ) => move_tab_to_index( tab_id, sorted_tab_index_list[ index ] ) ) );
                await finish( request_id, sorted_tab_id_list );
            },
            
            finish = async ( request_id, sorted_tab_id_list ) => {
                for ( const tab_id of sorted_tab_id_list ) {
                    const
                        callback = callback_map[ tab_id ];
                    
                    if ( typeof callback == 'function' ) {
                        await callback();
                    }
                    delete callback_map[ tab_id ];
                }
                delete sort_index_to_tab_id_map_map[ request_id ];
            };
        
        return async ( tab_id, requested_tab_id, request_id, total, sort_index, ctrl_key_pushed, callback ) => {
            const
                sort_index_to_tab_id_map = sort_index_to_tab_id_map_map[ request_id ] = sort_index_to_tab_id_map_map[ request_id ] ?? {};
            
            sort_index_to_tab_id_map[ sort_index ] = tab_id;
            callback_map[ tab_id ] = callback;
            
            if ( Object.keys( sort_index_to_tab_id_map ).length < total ) {
                return;
            }
            
            const
                sorted_tab_id_list = Object.keys( sort_index_to_tab_id_map ).sort().map( sort_index => sort_index_to_tab_id_map[ sort_index ] ),
                tab_index_list = await Promise.all( sorted_tab_id_list.map( get_tab_index ) ),
                sorted_tab_index_list = tab_index_list.slice( 0 ).sort();
            
            await sort_tabs( request_id, sorted_tab_id_list, sorted_tab_index_list );
            
            log_debug( `ctrl_key_pushed: ${ctrl_key_pushed}, requested_tab_id: ${requested_tab_id}` );
            
            if ( ! ctrl_key_pushed || ( requested_tab_id < 0 ) ) {
                return;
            }
            const
                activated_tab = await chrome.tabs.update( requested_tab_id, {
                    active : true,
                } );
            log_debug( `tab(id=${requested_tab_id}) is activated`, activated_tab );
        };
    } )(), // end of request_tab_sorting()
    
    on_message = ( message, sender, sendResponse ) => {
        log_debug( '*** on_message():', message, sender );
        
        const
            type = message.type,
            tab_id = sender.tab && sender.tab.id;
        
        let
            response = null;
        
        switch ( type ) {
            case 'GET_OPTIONS': {
                ( async () => {
                    const
                        names = ( typeof message.names == 'string' ) ? [ message.names ] : message.names,
                        namespace = message.namespace;
                    
                    response = {
                        tab_id,
                    };
                    
                    for ( let name of [ ... names ] ) {
                        name = String( name );
                        response[ name ] = await get_value( ( ( namespace ) ? ( String( namespace ) + '_' ) : '' ) + name );
                    }
                    sendResponse( response );
                } )();
                return true;
            }
            case 'RESET_CONTEXT_MENU': {
                ( async () => {
                    await initialize( 'onMessage' );
                    response = {
                        result : 'done',
                    }
                    sendResponse( response );
                } )();
                return true;
            }
            case 'RELOAD_TABS': {
                ( async () => {
                    await reload_tabs();
                    response = {
                        result : 'done',
                    };
                    sendResponse( response );
                } )();
                return true;
            }
            case 'NOTIFICATION_ONLOAD' : {
                log_debug( 'NOTIFICATION_ONLOAD: tab_id', tab_id, message );
                if ( tab_id ) {
                    ( async () => {
                        CONTENT_TAB_INFOS[ tab_id ] = Object.assign( message.info, {
                            tab_id : tab_id,
                        } );
                        await set_value( 'CONTENT_TAB_INFOS', CONTENT_TAB_INFOS );
                        log_debug( '=> CONTENT_TAB_INFOS', CONTENT_TAB_INFOS );
                        response = {
                            message,
                            tab_id,
                        }
                        sendResponse( response );
                    } )();
                    return true;
                }
                break;
            }
            case 'NOTIFICATION_ONUNLOAD' : {
                log_debug( 'NOTIFICATION_ONUNLOAD: tab_id', tab_id, message );
                if ( tab_id ) {
                    ( async () => {
                        delete CONTENT_TAB_INFOS[ tab_id ];
                        await set_value( 'CONTENT_TAB_INFOS', CONTENT_TAB_INFOS );
                        log_debug( '=> CONTENT_TAB_INFOS', CONTENT_TAB_INFOS );
                        response = {
                            message,
                            tab_id,
                        }
                        sendResponse( response );
                    } )();
                    return true;
                }
                break;
            }
            case 'TAB_SORT_REQUEST' : {
                log_debug( 'TAB_SORT_REQUEST: tab_id', tab_id, message );
                if ( tab_id ) {
                    ( async () => {
                        await request_tab_sorting( tab_id, message.requested_tab_id , message.request_id, message.total, message.sort_index, message.ctrl_key_pushed );
                        response = {
                            message,
                            tab_id,
                        };
                        sendResponse( response );
                    } )();
                    return true;
                }
                break;
            }
            case 'FETCH_TEXT_REQUEST' : {
                log_debug( 'FETCH_TEXT_REQUEST', message );
                ( async () => {
                    try {
                        const
                            fetch_response = await fetch( message.url, message.options );
                        if ( ! fetch_response.ok ) {
                            sendResponse( {
                                error : `${fetch_response.status} ${fetch_response.statusText}`,
                            } );
                            return;
                        }
                        const
                            text = await fetch_response.text();
                        log_debug( 'FETCH_TEXT_REQUEST => text', text );
                        sendResponse( {
                            //fetch_response, // TODO: Firefoxでこれを含めると、content_script側で「Error: Could not establish connection. Receiving end does not exist.」となってしまう
                            text,
                        } );
                    }
                    catch ( error ) {
                        log_error( 'FETCH_TEXT_REQUEST => error', error );
                        sendResponse( {
                            error,
                        } );
                    }
                } )();
                return true;
            }
            case 'FETCH_JSON_REQUEST' : {
                log_debug( 'FETCH_JSON_REQUEST', message );
                ( async () => {
                    try {
                        const
                            fetch_response = await fetch( message.url, message.options );
                        if ( ! fetch_response.ok ) {
                            sendResponse( {
                                error : `${fetch_response.status} ${fetch_response.statusText}`,
                            } );
                            return;
                        }
                        const
                            response_object = await fetch_response.json();
                        log_debug( 'FETCH_JSON_REQUEST => response_object', response_object );
                        sendResponse( {
                            //fetch_response, // TODO: Firefoxでこれを含めると、content_script側で「Error: Could not establish connection. Receiving end does not exist.」となってしまう
                            response_object,
                        } );
                    }
                    catch ( error ) {
                        log_error( 'FETCH_JSON_REQUEST => error', error );
                        sendResponse( {
                            error,
                        } );
                    }
                } )();
                return true;
            }
            case 'HEALTH_CHECK_REQUEST' : {
                log_debug( 'HEALTH_CHECK_REQUEST', message );
                sendResponse( {
                    is_ready : true,
                    tab_id,
                } );
                break;
            }
            default: {
                log_debug( `Unsupported message: ${type}` );
                response = {
                    message,
                    error : `Unsupported message: ${type}`,
                }
                sendResponse( response );
                log_debug( 'response', response );
                break;
            }
        }
        return false;
    }, // end of on_message()
    
    on_click = ( info, tab ) => {
        log_debug( '*** on_click():', info, tab );
        
        ( async () => {
            await update_context_menu_flags();
            
            if ( CONTEXT_MENU_IS_SUSPENDED ) {
                return;
            }
            
            switch ( info.menuItemId ) {
                case DOWNLOAD_MENU_ID : {
                    await download_image( info, tab );
                    break;
                }
                default : {
                    break;
                }
            }
        } )();
    }, // end of on_click()
    
    on_startup = () => {
        log_debug( '*** on_startup()' );
        
        ( async () => {
            await initialize( 'onStartup' );
        } )();
    }, // end of on_startup()
    
    on_installed = ( details ) => {
        log_debug( '*** on_installed():', details );
        
        ( async () => {
            await remove_values( [ 'DOWNLOAD_HELPER_SCRIPT_IS_VALID', 'CONTEXT_MENU_IS_VISIBLE', SCRIPT_NAME + '-download_tab_map' ] );
            await initialize( 'onInstalled' );
        } )();
        //reload_tabs();
    }; // end of on_installed()


// ■ 各種イベント設定
// [chrome.runtime - Google Chrome](https://developer.chrome.com/extensions/runtime)
// [chrome.contextMenus - Google Chrome](https://developer.chrome.com/extensions/contextMenus)

// メッセージ受信
chrome.runtime.onMessage.addListener( on_message );

// クリックイベント(コンテキストメニュー)
chrome.contextMenus.onClicked.addListener( on_click );

chrome.action.onClicked.addListener( () => chrome.runtime.openOptionsPage() );

// Installed イベント
chrome.runtime.onInstalled.addListener( on_installed );

// Startup イベント
if ( chrome.runtime.onStartup ) {
    chrome.runtime.onStartup.addListener( on_startup );
}

// DeterminingFilename イベント
// TODO: 副作用（他拡張機能との競合）が大きいため、保留(0.1.7.1702)
//chrome.downloads.onDeterminingFilename.addListener( on_determining_filename );

window.log_debug = log_debug;
window.log_error = log_error;

await initialize( 'main', true );

} )(
    ( typeof window !== 'undefined' ? window : self ),
    ( typeof document !== 'undefined' ? document : self.document )
);

// ■ end of file
