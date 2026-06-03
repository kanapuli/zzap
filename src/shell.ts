export type SupportedShell = 'bash' | 'zsh';

export function shellInit(shell: SupportedShell): string {
  if (shell === 'bash') {
    return bashInit();
  }

  return zshInit();
}

export function parseShell(value: string): SupportedShell {
  if (value === 'bash' || value === 'zsh') {
    return value;
  }

  throw new Error(`Unsupported shell "${value}". Expected "zsh" or "bash".`);
}

function zshInit(): string {
  return [
    'zz() {',
    '  case "$1" in',
    '    init|add|list|prune|doctor|help|--help|-h|--version|-v)',
    '      ZZAP_SHELL_INTEGRATION=1 command zz "$@"',
    '      return $?',
    '      ;;',
    '  esac',
    '',
    '  local zz_target',
    '  zz_target="$(ZZAP_SHELL_INTEGRATION=1 command zz __jump "$@")" || return $?',
    '  if [ -n "$ZZAP_DEBUG" ]; then',
    '    printf "zz selected: %s\\n" "$zz_target" >&2',
    '  fi',
    '  if [ -n "$zz_target" ]; then',
    '    builtin cd "$zz_target" || return $?',
    '    if [ -n "$ZZAP_DEBUG" ]; then',
    '      printf "zz cwd: %s\\n" "$PWD" >&2',
    '    fi',
    '  fi',
    '}',
  ].join('\n');
}

function bashInit(): string {
  return zshInit();
}
