import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
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
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
* @route '/doctor/consultations'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
* @route '/doctor/consultations'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
* @route '/doctor/consultations'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
* @route '/doctor/consultations'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::index
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:25
* @route '/doctor/consultations'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

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
        }
    }),
    method: 'get',
})

index.form = indexForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
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
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
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
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
* @route '/doctor/consultations/{consultation}'
*/
show.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
* @route '/doctor/consultations/{consultation}'
*/
show.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
* @route '/doctor/consultations/{consultation}'
*/
const showForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
* @route '/doctor/consultations/{consultation}'
*/
showForm.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::show
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:107
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

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
* @route '/doctor/consultations/{consultation}/briefing'
*/
export const briefing = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: briefing.url(args, options),
    method: 'post',
})

briefing.definition = {
    methods: ["post"],
    url: '/doctor/consultations/{consultation}/briefing',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
* @route '/doctor/consultations/{consultation}/briefing'
*/
briefing.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return briefing.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
* @route '/doctor/consultations/{consultation}/briefing'
*/
briefing.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: briefing.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
* @route '/doctor/consultations/{consultation}/briefing'
*/
const briefingForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: briefing.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::briefing
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:160
* @route '/doctor/consultations/{consultation}/briefing'
*/
briefingForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: briefing.url(args, options),
    method: 'post',
})

briefing.form = briefingForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
export const similar = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: similar.url(args, options),
    method: 'get',
})

similar.definition = {
    methods: ["get","head"],
    url: '/doctor/consultations/{consultation}/similar',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
similar.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return similar.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
similar.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: similar.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
similar.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: similar.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
const similarForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: similar.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
similarForm.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: similar.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::similar
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:177
* @route '/doctor/consultations/{consultation}/similar'
*/
similarForm.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: similar.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

similar.form = similarForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::saveNotes
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
* @route '/doctor/consultations/{consultation}/notes'
*/
export const saveNotes = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: saveNotes.url(args, options),
    method: 'post',
})

saveNotes.definition = {
    methods: ["post"],
    url: '/doctor/consultations/{consultation}/notes',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::saveNotes
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
* @route '/doctor/consultations/{consultation}/notes'
*/
saveNotes.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return saveNotes.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::saveNotes
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
* @route '/doctor/consultations/{consultation}/notes'
*/
saveNotes.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: saveNotes.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::saveNotes
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
* @route '/doctor/consultations/{consultation}/notes'
*/
const saveNotesForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: saveNotes.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::saveNotes
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:187
* @route '/doctor/consultations/{consultation}/notes'
*/
saveNotesForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: saveNotes.url(args, options),
    method: 'post',
})

saveNotes.form = saveNotesForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::markReviewed
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
* @route '/doctor/consultations/{consultation}/review'
*/
export const markReviewed = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: markReviewed.url(args, options),
    method: 'post',
})

markReviewed.definition = {
    methods: ["post"],
    url: '/doctor/consultations/{consultation}/review',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::markReviewed
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
* @route '/doctor/consultations/{consultation}/review'
*/
markReviewed.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return markReviewed.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::markReviewed
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
* @route '/doctor/consultations/{consultation}/review'
*/
markReviewed.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: markReviewed.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::markReviewed
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
* @route '/doctor/consultations/{consultation}/review'
*/
const markReviewedForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: markReviewed.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::markReviewed
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:216
* @route '/doctor/consultations/{consultation}/review'
*/
markReviewedForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: markReviewed.url(args, options),
    method: 'post',
})

markReviewed.form = markReviewedForm

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
export const exportPdf = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: exportPdf.url(args, options),
    method: 'get',
})

exportPdf.definition = {
    methods: ["get","head"],
    url: '/doctor/consultations/{consultation}/export',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
exportPdf.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return exportPdf.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
exportPdf.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: exportPdf.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
exportPdf.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: exportPdf.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
const exportPdfForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: exportPdf.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
exportPdfForm.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: exportPdf.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Doctor\ConsultationReviewController::exportPdf
* @see app/Http/Controllers/Doctor/ConsultationReviewController.php:240
* @route '/doctor/consultations/{consultation}/export'
*/
exportPdfForm.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: exportPdf.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

exportPdf.form = exportPdfForm

const ConsultationReviewController = { index, show, briefing, similar, saveNotes, markReviewed, exportPdf }

export default ConsultationReviewController