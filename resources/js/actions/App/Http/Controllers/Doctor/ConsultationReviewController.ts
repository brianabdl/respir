import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/doctor/consultations',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:14
* @route '/doctor/consultations'
*/
indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
export const show = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/doctor/consultations/{consultation}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
show.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return show.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
show.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
show.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
const showForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
showForm.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:42
* @route '/doctor/consultations/{consultation}'
*/
showForm.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

show.form = showForm

const ConsultationReviewController = { index, show }

export default ConsultationReviewController