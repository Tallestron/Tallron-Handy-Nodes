"""Prompt Builder (Tallron)

Three-panel prompt composer with optional Generate Text assembly.
"""

import asyncio

CLIP_TYPES = [
    "qwen_image",
    "joyimage",
    "lumina2",
    "lens",
    "omnigen2",
    "flux2",
    "flux3",
    "fibo2",
    "hidream",
    "minimax",
    "ovis",
    "longcat_image",
    "hunyuan_image",
    "wan",
    "sd3",
    "stable_diffusion",
    "ltxv",
    "cosmos",
    "chroma",
    "ace",
    "cogvideox",
    "pixart",
    "mochi",
    "stable_cascade",
    "stable_audio",
]

_CLIP_CACHE = {}


class TallronPromptBuilder:
    """
    On-node prompt builder with categories, items, and a composition area.

    STRING outputs:
    - text: snippets joined from the bottom panel
    - assembled: last Generate Text result (Simple / Enhance / Custom)
    """

    DESCRIPTION = (
        "Prompt Builder — pick categories on the left, items on the right, "
        "and collect snippets at the bottom. Simple, Enhance, and Custom "
        "run the selected text model and write the result to the bottom field."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "builder_json": (
                    "STRING",
                    {
                        "default": "{}",
                        "multiline": True,
                    },
                ),
                "composed_prompt": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
                "assembled_prompt": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("text", "assembled")
    FUNCTION = "get_prompt"
    CATEGORY = "Tallron Handy Nodes"
    OUTPUT_NODE = False

    def get_prompt(self, builder_json, composed_prompt, assembled_prompt=""):
        text = composed_prompt if isinstance(composed_prompt, str) else ""
        assembled = assembled_prompt if isinstance(assembled_prompt, str) else ""
        return (text, assembled)


def _model_names():
    try:
        import folder_paths
    except Exception:
        return []
    names = []
    for folder in ("text_encoders", "clip"):
        try:
            names.extend(folder_paths.get_filename_list(folder) or [])
        except Exception:
            continue
    # Preserve order, drop duplicates.
    seen = set()
    out = []
    for name in names:
        if name and name not in seen:
            seen.add(name)
            out.append(name)
    return out


def _ensure_server_attrs():
    """clip.generate reports progress through PromptServer.last_prompt_id.
    That attribute is only created while a graph is running, so a button
    click before any queue raises AttributeError. Set it if it is missing.
    """
    try:
        from server import PromptServer
        srv = getattr(PromptServer, "instance", None)
    except Exception:
        return
    if srv is None:
        return
    if not hasattr(srv, "last_prompt_id") or getattr(srv, "last_prompt_id", None) is None:
        srv.last_prompt_id = "tallron-prompt-builder"
    if not hasattr(srv, "last_node_id"):
        srv.last_node_id = None
    if not hasattr(srv, "client_id"):
        srv.client_id = None


def _load_clip(name, clip_type):
    """Load a text encoder. clip_name is the file; clip_type is the architecture."""
    clip_type = (clip_type or "qwen_image").strip() or "qwen_image"
    name = (name or "").strip()
    if not name:
        raise RuntimeError("Choose a text model in the gear settings.")
    if name == clip_type:
        raise RuntimeError("The text model is set to the encoder type. Pick a model file in the gear settings.")
    key = (name, clip_type)
    if key in _CLIP_CACHE:
        return _CLIP_CACHE[key]
    _ensure_server_attrs()
    import inspect
    import nodes
    loader_cls = nodes.CLIPLoader
    fn = getattr(loader_cls, "load_clip", None) or getattr(loader_cls, "execute", None)
    if fn is None:
        raise RuntimeError("This ComfyUI build has no CLIPLoader.load_clip.")
    params = list(inspect.signature(fn).parameters)
    # Instance methods still show "self" when read off the class.
    if params and params[0] == "self":
        loaded = fn(loader_cls(), name, clip_type, "default")
    else:
        loaded = fn(name, clip_type, "default")
    clip = loaded[0] if isinstance(loaded, (tuple, list)) else loaded
    _CLIP_CACHE[key] = clip
    return clip


def _generate_text(clip, prompt, system_prompt, settings):
    thinking = bool(settings.get("thinking"))
    max_length = max(1, min(32768, int(settings.get("max_length") or 512)))
    sampling = str(settings.get("sampling_mode") or "on") == "on"
    mtp = settings.get("mtp") or "auto"
    mtp_val = {"off": False, "auto": True}.get(mtp, mtp)
    try:
        if isinstance(mtp_val, str) and mtp_val.isdigit():
            mtp_val = int(mtp_val)
    except Exception:
        mtp_val = True

    tokenize_kwargs = {
        "skip_template": False,
        "min_length": 1,
        "thinking": thinking,
        "system_prompt": system_prompt or "",
    }
    try:
        tokens = clip.tokenize(prompt, **tokenize_kwargs)
    except TypeError:
        merged = prompt if not system_prompt else (system_prompt.strip() + "\n\n" + prompt)
        tokens = clip.tokenize(merged)

    gen_kwargs = {
        "do_sample": sampling,
        "max_length": max_length,
        "temperature": float(settings.get("temperature") if settings.get("temperature") is not None else 0.7),
        "top_k": int(settings.get("top_k") if settings.get("top_k") is not None else 64),
        "top_p": float(settings.get("top_p") if settings.get("top_p") is not None else 0.95),
        "min_p": float(settings.get("min_p") if settings.get("min_p") is not None else 0.05),
        "repetition_penalty": float(settings.get("repetition_penalty") if settings.get("repetition_penalty") is not None else 1.05),
        "presence_penalty": float(settings.get("presence_penalty") if settings.get("presence_penalty") is not None else 0.0),
        "seed": int(settings.get("seed") or 0),
    }
    try:
        generated = clip.generate(tokens, mtp=mtp_val, **gen_kwargs)
    except TypeError:
        generated = clip.generate(tokens, **gen_kwargs)

    text = clip.decode(generated) if hasattr(clip, "decode") else generated
    if not isinstance(text, str):
        text = "" if text is None else str(text)
    _reasoning, sep, body = text.partition("</think>")
    if sep:
        text = body
    return text.strip()


def _generate_blocking(payload):
    _ensure_server_attrs()
    model = (payload.get("model") or "").strip()
    if not model:
        raise RuntimeError("Choose a text model in the gear settings.")
    prompt = payload.get("prompt") if isinstance(payload.get("prompt"), str) else ""
    if not prompt.strip():
        raise RuntimeError("The prompt is empty. Add snippets first.")
    system_prompt = payload.get("system_prompt") if isinstance(payload.get("system_prompt"), str) else ""
    settings = payload.get("settings") if isinstance(payload.get("settings"), dict) else {}
    clip_type = (payload.get("type") or settings.get("type") or "qwen_image").strip()
    clip = _load_clip(model, clip_type)
    return _generate_text(clip, prompt, system_prompt, settings)


def _register_routes():
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception as exc:
        print(f"[Tallron] Prompt Builder text routes not registered: {exc}")
        return

    @PromptServer.instance.routes.get("/tallron/prompt-builder/models")
    async def prompt_builder_models(request):
        return web.json_response({"models": _model_names(), "types": CLIP_TYPES})

    @PromptServer.instance.routes.post("/tallron/prompt-builder/generate")
    async def prompt_builder_generate(request):
        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON."}, status=400)
        try:
            _ensure_server_attrs()
            text = await asyncio.get_running_loop().run_in_executor(None, _generate_blocking, payload)
        except AttributeError as exc:
            if "last_prompt_id" not in str(exc):
                return web.json_response({"error": str(exc)}, status=500)
            _ensure_server_attrs()
            try:
                text = await asyncio.get_running_loop().run_in_executor(None, _generate_blocking, payload)
            except Exception as exc2:
                return web.json_response({"error": str(exc2)}, status=500)
        except Exception as exc:
            return web.json_response({"error": str(exc)}, status=500)
        return web.json_response({"text": text})


_register_routes()


NODE_CLASS_MAPPINGS = {
    "TallronPromptBuilder": TallronPromptBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronPromptBuilder": "Prompt Builder",
}
