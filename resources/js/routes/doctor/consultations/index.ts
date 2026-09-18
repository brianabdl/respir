import {
    queryParams,
    type RouteQueryOptions,
    type RouteDefinition,
    type RouteFormDefinition,
    applyUrlDefaults,
} from './../../../wayfinder';
/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
});

index.definition = {
    methods: ['get', 'head'],
    url: '/doctor/consultations',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options);
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
const indexForm = (
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
 * @route '/doctor/consultations'
 */
indexForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

index.form = indexForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
export const show = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
});

show.definition = {
    methods: ['get', 'head'],
    url: '/doctor/consultations/{consultation}',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
show.url = (
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
        show.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
show.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
show.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
const showForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
showForm.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
 * @route '/doctor/consultations/{consultation}'
 */
showForm.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: show.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

show.form = showForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
 * @route '/doctor/consultations/{consultation}/briefing'
 */
export const briefing = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: briefing.url(args, options),
    method: 'post',
});

briefing.definition = {
    methods: ['post'],
    url: '/doctor/consultations/{consultation}/briefing',
} satisfies RouteDefinition<['post']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
 * @route '/doctor/consultations/{consultation}/briefing'
 */
briefing.url = (
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
        briefing.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
 * @route '/doctor/consultations/{consultation}/briefing'
 */
briefing.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: briefing.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
 * @route '/doctor/consultations/{consultation}/briefing'
 */
const briefingForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: briefing.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
 * @route '/doctor/consultations/{consultation}/briefing'
 */
briefingForm.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: briefing.url(args, options),
    method: 'post',
});

briefing.form = briefingForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
export const similar = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: similar.url(args, options),
    method: 'get',
});

similar.definition = {
    methods: ['get', 'head'],
    url: '/doctor/consultations/{consultation}/similar',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
similar.url = (
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
        similar.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
similar.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: similar.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
similar.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'head'> => ({
    url: similar.url(args, options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
const similarForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: similar.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
similarForm.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: similar.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
 * @route '/doctor/consultations/{consultation}/similar'
 */
similarForm.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: similar.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

similar.form = similarForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::notes
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
 * @route '/doctor/consultations/{consultation}/notes'
 */
export const notes = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: notes.url(args, options),
    method: 'post',
});

notes.definition = {
    methods: ['post'],
    url: '/doctor/consultations/{consultation}/notes',
} satisfies RouteDefinition<['post']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::notes
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
 * @route '/doctor/consultations/{consultation}/notes'
 */
notes.url = (
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
        notes.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::notes
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
 * @route '/doctor/consultations/{consultation}/notes'
 */
notes.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: notes.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::notes
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
 * @route '/doctor/consultations/{consultation}/notes'
 */
const notesForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: notes.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::notes
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
 * @route '/doctor/consultations/{consultation}/notes'
 */
notesForm.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: notes.url(args, options),
    method: 'post',
});

notes.form = notesForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::review
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
 * @route '/doctor/consultations/{consultation}/review'
 */
export const review = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: review.url(args, options),
    method: 'post',
});

review.definition = {
    methods: ['post'],
    url: '/doctor/consultations/{consultation}/review',
} satisfies RouteDefinition<['post']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::review
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
 * @route '/doctor/consultations/{consultation}/review'
 */
review.url = (
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
        review.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::review
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
 * @route '/doctor/consultations/{consultation}/review'
 */
review.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: review.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::review
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
 * @route '/doctor/consultations/{consultation}/review'
 */
const reviewForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: review.url(args, options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::review
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
 * @route '/doctor/consultations/{consultation}/review'
 */
reviewForm.post = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: review.url(args, options),
    method: 'post',
});

review.form = reviewForm;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
export const exportMethod = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: exportMethod.url(args, options),
    method: 'get',
});

exportMethod.definition = {
    methods: ['get', 'head'],
    url: '/doctor/consultations/{consultation}/export',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
exportMethod.url = (
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
        exportMethod.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
    );
};

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
exportMethod.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'get'> => ({
    url: exportMethod.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
exportMethod.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteDefinition<'head'> => ({
    url: exportMethod.url(args, options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
const exportMethodForm = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: exportMethod.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
exportMethodForm.get = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: exportMethod.url(args, options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportMethod
 * @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
 * @route '/doctor/consultations/{consultation}/export'
 */
exportMethodForm.head = (
    args:
        | { consultation: number | { id: number } }
        | [consultation: number | { id: number }]
        | number
        | { id: number },
    options?: RouteQueryOptions,
): RouteFormDefinition<'get'> => ({
    action: exportMethod.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

exportMethod.form = exportMethodForm;

const consultations = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
    briefing: Object.assign(briefing, briefing),
    similar: Object.assign(similar, similar),
    notes: Object.assign(notes, notes),
    review: Object.assign(review, review),
    export: Object.assign(exportMethod, exportMethod),
};

export default consultations;
