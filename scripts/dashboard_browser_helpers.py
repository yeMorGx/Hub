"""Public demo interactions through the real HeroUI Select, not its hidden input."""
SCENARIOS = {
    'running': 'Timer ativo', 'lunch': 'Pausa para almoço', 'idle': 'Timer parado',
    'unconfigured': 'Jornada não configurada', 'holiday': 'Semana com feriado',
    'empty': 'Sem dados', 'error': 'Falha ao carregar escala',
}
def select_scenario(page, value):
    page.locator('.today-demo-controls .zulu-select').get_by_role('button').click()
    page.get_by_role('option', name=SCENARIOS[value], exact=True).click()

    page.get_by_role('listbox').wait_for(state='hidden')
    page.locator('.today-timer-primary').focus()
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(100)
