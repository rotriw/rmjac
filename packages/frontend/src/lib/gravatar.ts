import CryptoJS from 'crypto-js'

/**
 * 根据邮箱生成 Gravatar 头像链接
 * @param email 用户的邮箱地址
 * @param size 头像大小，默认为 200
 * @returns Gravatar 图片链接
 */
export function getGravatarUrl(email: string, size: number = 200): string {
  const trimmedEmail = email.trim().toLowerCase()
  const hash = CryptoJS.MD5(trimmedEmail).toString()
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}