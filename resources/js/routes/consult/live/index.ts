import {
    queryParams,
    type RouteQueryOptions,
    type RouteDefinition,
    type RouteFormDefinition,
    applyUrlDefaults,
} from './../../../wayfinder';
/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
export const token = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: token.url(args, options),
    method: 'get',
});

token.definition = {
    methods: ['get', 'head'],
    url: '/consult/{consultation}/live/token',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
token.url = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { consultation: args };
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { consultation: args.id };
    }

    if (Array.isArray(args)) {
        args = {
            consultation: args[0],
        };
    }

    args = applyUrlDefaults(args);

    const parsedArgs = {
        consultation:
            typeof args.consultation === 'object'
                ? args.consultation.id
                : args.consultation,
    };

    return (
        token.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
token.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: token.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
token.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'head'> => ({
    url: token.url(args, options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
const tokenForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: token.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
tokenForm.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: token.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Consult\ConsultationController::token
 * @see app/Http/Controllers/Consult/ConsultationController.php:310
 * @route '/consult/{consultation}/live/token'
 */
tokenForm.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: token.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

token.form = tokenForm;

const live = {
    token: Object.assign(token, token),
};

export default live;
