import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/consult',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
const indexForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
*/
indexForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::index
* @see app/Http/Controllers/Consult/ConsultationController.php:33
* @route '/consult'
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
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:46
* @route '/consult'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/consult',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:46
* @route '/consult'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:46
* @route '/consult'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:46
* @route '/consult'
*/
const storeForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::store
* @see app/Http/Controllers/Consult/ConsultationController.php:46
* @route '/consult'
*/
storeForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: store.url(options),
    method: 'post',
})

store.form = storeForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:56
* @route '/consult/{consultation}/chat'
*/
export const chat = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: chat.url(args, options),
    method: 'post',
})

chat.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/chat',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:56
* @route '/consult/{consultation}/chat'
*/
chat.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return chat.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:56
* @route '/consult/{consultation}/chat'
*/
chat.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: chat.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:56
* @route '/consult/{consultation}/chat'
*/
const chatForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: chat.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::chat
* @see app/Http/Controllers/Consult/ConsultationController.php:56
* @route '/consult/{consultation}/chat'
*/
chatForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: chat.url(args, options),
    method: 'post',
})

chat.form = chatForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:102
* @route '/consult/{consultation}/voice'
*/
export const voice = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: voice.url(args, options),
    method: 'post',
})

voice.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/voice',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:102
* @route '/consult/{consultation}/voice'
*/
voice.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return voice.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:102
* @route '/consult/{consultation}/voice'
*/
voice.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: voice.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:102
* @route '/consult/{consultation}/voice'
*/
const voiceForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: voice.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::voice
* @see app/Http/Controllers/Consult/ConsultationController.php:102
* @route '/consult/{consultation}/voice'
*/
voiceForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: voice.url(args, options),
    method: 'post',
})

voice.form = voiceForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
export const liveToken = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: liveToken.url(args, options),
    method: 'get',
})

liveToken.definition = {
    methods: ["get","head"],
    url: '/consult/{consultation}/live/token',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
liveToken.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return liveToken.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
liveToken.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: liveToken.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
liveToken.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: liveToken.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
const liveTokenForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: liveToken.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
liveTokenForm.get = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: liveToken.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::liveToken
* @see app/Http/Controllers/Consult/ConsultationController.php:260
* @route '/consult/{consultation}/live/token'
*/
liveTokenForm.head = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: liveToken.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

liveToken.form = liveTokenForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::sessionLog
* @see app/Http/Controllers/Consult/ConsultationController.php:158
* @route '/consult/{consultation}/sessions'
*/
export const sessionLog = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: sessionLog.url(args, options),
    method: 'post',
})

sessionLog.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/sessions',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::sessionLog
* @see app/Http/Controllers/Consult/ConsultationController.php:158
* @route '/consult/{consultation}/sessions'
*/
sessionLog.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return sessionLog.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::sessionLog
* @see app/Http/Controllers/Consult/ConsultationController.php:158
* @route '/consult/{consultation}/sessions'
*/
sessionLog.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: sessionLog.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::sessionLog
* @see app/Http/Controllers/Consult/ConsultationController.php:158
* @route '/consult/{consultation}/sessions'
*/
const sessionLogForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: sessionLog.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::sessionLog
* @see app/Http/Controllers/Consult/ConsultationController.php:158
* @route '/consult/{consultation}/sessions'
*/
sessionLogForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: sessionLog.url(args, options),
    method: 'post',
})

sessionLog.form = sessionLogForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:192
* @route '/consult/{consultation}/cough'
*/
export const cough = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: cough.url(args, options),
    method: 'post',
})

cough.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/cough',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:192
* @route '/consult/{consultation}/cough'
*/
cough.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return cough.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:192
* @route '/consult/{consultation}/cough'
*/
cough.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: cough.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:192
* @route '/consult/{consultation}/cough'
*/
const coughForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: cough.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::cough
* @see app/Http/Controllers/Consult/ConsultationController.php:192
* @route '/consult/{consultation}/cough'
*/
coughForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: cough.url(args, options),
    method: 'post',
})

cough.form = coughForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::capture
* @see app/Http/Controllers/Consult/ConsultationController.php:224
* @route '/consult/{consultation}/captures'
*/
export const capture = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: capture.url(args, options),
    method: 'post',
})

capture.definition = {
    methods: ["post"],
    url: '/consult/{consultation}/captures',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::capture
* @see app/Http/Controllers/Consult/ConsultationController.php:224
* @route '/consult/{consultation}/captures'
*/
capture.url = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
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

    return capture.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::capture
* @see app/Http/Controllers/Consult/ConsultationController.php:224
* @route '/consult/{consultation}/captures'
*/
capture.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: capture.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::capture
* @see app/Http/Controllers/Consult/ConsultationController.php:224
* @route '/consult/{consultation}/captures'
*/
const captureForm = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: capture.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::capture
* @see app/Http/Controllers/Consult/ConsultationController.php:224
* @route '/consult/{consultation}/captures'
*/
captureForm.post = (args: { consultation: number | { id: number } } | [consultation: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
    action: capture.url(args, options),
    method: 'post',
})

capture.form = captureForm

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
export const captureDownload = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: captureDownload.url(args, options),
    method: 'get',
})

captureDownload.definition = {
    methods: ["get","head"],
    url: '/consult/{consultation}/captures/{capture}/download',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
captureDownload.url = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions) => {
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

    return captureDownload.definition.url
            .replace('{consultation}', parsedArgs.consultation.toString())
            .replace('{capture}', parsedArgs.capture.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
captureDownload.get = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: captureDownload.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
captureDownload.head = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: captureDownload.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
const captureDownloadForm = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: captureDownload.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
captureDownloadForm.get = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: captureDownload.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Consult\ConsultationController::captureDownload
* @see app/Http/Controllers/Consult/ConsultationController.php:247
* @route '/consult/{consultation}/captures/{capture}/download'
*/
captureDownloadForm.head = (args: { consultation: number | { id: number }, capture: string | number } | [consultation: number | { id: number }, capture: string | number ], options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: captureDownload.url(args, {
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        }
    }),
    method: 'get',
})

captureDownload.form = captureDownloadForm

const ConsultationController = { index, store, chat, voice, liveToken, sessionLog, cough, capture, captureDownload }

export default ConsultationController