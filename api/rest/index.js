import crypto from 'crypto'
import axios from 'axios'
import { CONSTANTS, renderError } from '../../src/utils.js'


const aesEncrypt = (secKey, text) => {
  const cipher = crypto.createCipheriv('AES-128-CBC', secKey, '0102030405060708')
  return cipher.update(text, 'utf-8', 'base64') + cipher.final('base64')
}

const aesRsaEncrypt = (text) => ({
  params: aesEncrypt('TA3YiYCfY2dDJQgg', aesEncrypt('0CoJUm6Qyw8W8jud', text)),
  encSecKey:
    '84ca47bca10bad09a6b04c5c927ef077d9b9f1e37098aa3eac6ea70eb59df0aa28b691b7e75e4f1f9831754919ea784c8f74fbfadf2898b0be17849fd656060162857830e241aba44991601f137624094c114ea8d17bce815b0cd4e5b8e2fbaba978c6d1d14dc3d1faf852bdd28818031ccdaaa13a6018e1024e2aae98844210',
})

export default async (request, response) => {
  const {
    id,
    type = '1',
    number = 5,
    title = 'Recently Played',
    width = 280,
    size = 800,
    show_percent = '0',
    cache = CONSTANTS.CACHE_FOUR_HOURS,
  } = request.query

  try {
    const { data } = await axios.post(
      'https://music.163.com/weapi/v1/play/record?csrf_token=',
      aesRsaEncrypt(
        JSON.stringify({
          uid: id,
          type,
        })
      ),
      {
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'gzip,deflate,sdch',
          'Accept-Language': 'zh-CN,en-US;q=0.7,en;q=0.3',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Host: 'music.163.com',
          Referer: 'https://music.163.com/',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
          Cookie:
            'os=pc; osver=Microsoft-Windows-10-Professional-build-10586-64bit; appver=2.0.3.131777; ',
        },
      }
    )

    const songs = data[Number(type) === 1 ? 'weekData' : 'allData'].slice(0, Number(number))

    const buffers = await Promise.all(
      songs.map(({ song }) =>
        axios.get(`${song.al.picUrl}${size !== '800' ? `?param=${size}x${size}` : ''}`, {
          responseType: 'arraybuffer',
        })
      )
    )

    const covers = buffers.map((buffer) => {
      const buffer64 = Buffer.from(buffer.data, 'binary').toString('base64')
      return `data:image/jpg;base64,` + buffer64
    })

    const templateParams = {
      recentPlayed: songs.map(({ song, score }, i) => {
        return {
          name: song.name,
          artist: song.ar.map(({ name }) => name).join('/'),
          cover: covers[i],
          url: `https://music.163.com/#/song?id=${song.id}`,
          percent: show_percent === '1' ? score / 100 : 0,
        }
      }),
      themeConfig: { title, width: Number(width) },
    }
    response.setHeader(
      'Cache-Control',
      `public, max-age=${Math.max(
        CONSTANTS.CACHE_FOUR_HOURS,
        Math.min(Number(cache), CONSTANTS.CACHE_ONE_DAY)
      )}`
    )
    response.setHeader('content-type', 'image/svg+xml')
    response.statusCode = 200
    response.send(JSON.stringify(templateParams))
  } catch (err) {
    response.setHeader('Cache-Control', `no-cache, no-store, must-revalidate`)
    return response.send(renderError(err.message, err.secondaryMessage))
  }
}
