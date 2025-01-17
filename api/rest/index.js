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

const encryptedParams = {
  allData: {
    params: 'j0AUmZyQsNnPXaxuE/2IalhILiV97UOCIGaQ9fBHTFOT6E0CvWG5f7MUehhnZdrZAdAwCpbQ/I/QWXZOMhyyoJ3GikfWeOiTWeLyMef5eOnVJNze4W+OVtHfRMc6fh3wF5XKyta1zEXXMItoLMYK/Ja6E0+FVBNd300Wcg1HhvhHvI3NC3M5nXWL960AbRxA',
    encSecKey: 'a09029b6c5fe219dce495ff4e4190e1658df9e846514cc906914a4da3badabb5c7deca77a8ab1aefca8932b4c8cb774c28c8009872f2fc9574d3175e7e0210e497709f8e608ea528bb8a8ecc4a53b4f6e977e4e5ef1bf529cdd20448c8a6dbf4bace0be80c0a30036698f220e53a16dba6165bad557e5046b0eb82a711e1ad92'
  },
  weekData: {
    params: 'NsP3dKdRL3VMcx0vicrY+jOAPFyiW6w1JqOBvIT2qSEKTJ7J2s90fnnRmJgfrsm0xfwRPYr0L9LYAJx2GPyomyfMh2S+gz61zyAbNx+f8ICsKH9waAvYIZOSGZRpX9NurD1vpy6PJVCH1bH1ZM/8jZI335cN8zgFLqxRYafaeikSwn/LMfr4uOSkV2PGvY/O',
    encSecKey: 'abbdb4d9862b43599dff94bdfa06e01c1568c9d99edb2357b34828b77d7a2902b7b522f7b1c801ce940ced88a99d53702f4ce64504187f58c27384e12ea64f0bde20da6d942da4c6961eac26a678769e7615f09ffb204e5f4f8d99c81d9b81a9fe1792a25e63843ca650dabe88145dd5de320d32fb44b4d1e7aedbc6f46fef03'
  }
};

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
    const payload = encryptedParams[Number(type) === 1 ? 'weekData' : 'allData']
    console.log(payload)
    const { data } = await axios.post(
      'https://music.163.com/weapi/v1/play/record?csrf_token=',
      payload
      ,
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

    console.log(payload)
    const songs = data[Number(type) === 1 ? 'weekData' : 'allData'].slice(0, Number(number))

    // const buffers = await Promise.all(
    //   songs.map(({ song }) =>
    //     axios.get(`${song.al.picUrl}${size !== '800' ? `?param=${size}x${size}` : ''}`, {
    //       responseType: 'arraybuffer',
    //     })
    //   )
    // )

    // const covers = buffers.map((buffer) => {
    //   const buffer64 = Buffer.from(buffer.data, 'binary').toString('base64')
    //   return `data:image/jpg;base64,` + buffer64
    // })

    const templateParams = {
      recentPlayed: songs.map(({ song, score }, i) => {
        return {
          name: song.name,
          artist: song.ar.map(({ name }) => name).join('/'),
          // cover: covers[i],
          cover_url: `${song.al.picUrl}${size !== '800' ? `?param=${size}x${size}` : ''}`,
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
    response.setHeader('Access-Control-Allow-Origin', 'https://blog.yuanpei.me')
    response.setHeader('Access-Control-Allow-Methods', 'DELETE,PUT,POST,GET,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', '*')
    response.setHeader('content-type', 'application/json')
    response.statusCode = 200
    response.send(JSON.stringify(templateParams))
  } catch (err) {
    response.setHeader('Cache-Control', `no-cache, no-store, must-revalidate`)
    return response.send(renderError(err.message, err.secondaryMessage))
  }
}
