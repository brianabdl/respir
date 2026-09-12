import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Consult\ConsultationController::log
* @see app/Http/Controllers/Consult/ConsultationController.php:201
* @route '/consult/{consultation}/sessions'
*/
export const log = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: log.url(args, options),
    method: 'post',
})

log.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/sessions',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::log
* @see app/Http/Controllers/Consult/ConsultationController.php:201
* @route '/consult/{consultation}/sessions'
*/
log.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return log.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::log
* @see app/Http/Controllers/Consult/ConsultationController.php:201
* @route '/consult/{consultation}/sessions'
*/
log.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: log.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::log
* @see app/Http/Controllers/Consult/ConsultationController.php:201
* @route '/consult/{consultation}/sessions'
*/
const logForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: log.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::log
* @see app/Http/Controllers/Consult/ConsultationController.php:201
* @route '/consult/{consultation}/sessions'
*/
logForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: log.url(args, options),
    method: 'post',
})

log.form = logForm

const sessions = {
    log: Object.assign(log, log),
}

export default sessions