import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:234
* @route '/consult/{consultation}/captures'
*/
export const store = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/captures',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:234
* @route '/consult/{consultation}/captures'
*/
store.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
    }

    return store.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:234
* @route '/consult/{consultation}/captures'
*/
store.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:234
* @route '/consult/{consultation}/captures'
*/
const storeForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:234
* @route '/consult/{consultation}/captures'
*/
storeForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(args, options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
export const download = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: download.url(args, options),
    method: 'get',
})

download.definition = {
    methods: ["get","head"],
    url: '/consult/{consultation}/captures/{capture}/download',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
download.url = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
            capture: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        consultation: typeof args.consultation === 'object'
        ? args.consultation.id
        : args.consultation,
        capture: args.capture,
    }

    return download.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace('{capture}', parsedArgs.capture.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
download.get = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: download.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
download.head = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: download.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
const downloadForm = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: download.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
downloadForm.get = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: download.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::download
* @see app/Http/Controllers/Consult/ConsultationController.php:257
* @route '/consult/{consultation}/captures/{capture}/download'
*/
downloadForm.head = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: download.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

download.form = downloadForm

const captures = {
    store: Object.assign(store, store),
    download: Object.assign(download, download),
}

export default captures