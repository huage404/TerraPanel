export interface ServerCommand {
  name: string
  usage: string
  description: string
  /** Text inserted into the input when selected (no leading slash). */
  insert: string
}

/** Terraria dedicated-server console commands (no leading slash when sent). */
export const SERVER_COMMANDS: ServerCommand[] = [
  {
    name: 'help',
    usage: 'help',
    description: '显示可用命令列表',
    insert: 'help',
  },
  {
    name: 'playing',
    usage: 'playing',
    description: '显示在线玩家列表',
    insert: 'playing',
  },
  {
    name: 'clear',
    usage: 'clear',
    description: '清空控制台窗口',
    insert: 'clear',
  },
  {
    name: 'exit',
    usage: 'exit',
    description: '关闭服务器并保存世界',
    insert: 'exit',
  },
  {
    name: 'exit-nosave',
    usage: 'exit-nosave',
    description: '关闭服务器但不保存',
    insert: 'exit-nosave',
  },
  {
    name: 'save',
    usage: 'save',
    description: '保存游戏世界',
    insert: 'save',
  },
  {
    name: 'kick',
    usage: 'kick <玩家名>',
    description: '将指定玩家踢出服务器',
    insert: 'kick ',
  },
  {
    name: 'ban',
    usage: 'ban <玩家名>',
    description: '将指定玩家封禁',
    insert: 'ban ',
  },
  {
    name: 'password',
    usage: 'password [新密码]',
    description: '查看或修改服务器密码',
    insert: 'password',
  },
  {
    name: 'version',
    usage: 'version',
    description: '打印服务器版本号',
    insert: 'version',
  },
  {
    name: 'time',
    usage: 'time',
    description: '显示当前游戏时间',
    insert: 'time',
  },
  {
    name: 'port',
    usage: 'port',
    description: '打印监听端口',
    insert: 'port',
  },
  {
    name: 'maxplayers',
    usage: 'maxplayers',
    description: '打印最大玩家数',
    insert: 'maxplayers',
  },
  {
    name: 'say',
    usage: 'say <内容>',
    description: '向全服发送广播消息',
    insert: 'say ',
  },
  {
    name: 'motd',
    usage: 'motd [内容]',
    description: '查看或修改每日消息（MOTD）',
    insert: 'motd',
  },
  {
    name: 'dawn',
    usage: 'dawn',
    description: '将时间设为黎明',
    insert: 'dawn',
  },
  {
    name: 'noon',
    usage: 'noon',
    description: '将时间设为正午',
    insert: 'noon',
  },
  {
    name: 'dusk',
    usage: 'dusk',
    description: '将时间设为黄昏',
    insert: 'dusk',
  },
  {
    name: 'midnight',
    usage: 'midnight',
    description: '将时间设为午夜',
    insert: 'midnight',
  },
  {
    name: 'settle',
    usage: 'settle',
    description: '平定所有水体',
    insert: 'settle',
  },
  {
    name: 'seed',
    usage: 'seed',
    description: '显示世界种子',
    insert: 'seed',
  },
]

export function filterServerCommands(query: string): ServerCommand[] {
  const normalized = query.trim().toLowerCase().replace(/^\//, '')
  if (!normalized) return SERVER_COMMANDS

  return SERVER_COMMANDS.filter(
    (command) =>
      command.name.startsWith(normalized) ||
      command.description.includes(normalized) ||
      command.usage.toLowerCase().includes(normalized),
  )
}

/** Detect `/command` style prefix for autocomplete (first token only). */
export function getSlashQuery(value: string): string | null {
  if (!value.startsWith('/')) return null
  if (/\s/.test(value.slice(1))) return null
  return value.slice(1)
}
