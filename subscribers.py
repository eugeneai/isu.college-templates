from pyramid.renderers import get_renderer


def add_base_template(event):
    """Add base templates.
    """
    main = get_renderer('work-program.pt').implementation()
    doc_template = get_renderer('doc-page.pt').implementation()
    event.update({'work_program_template': main,
                  'doc_template': doc_template,
                  })
