// Seed dictionary. Rows: [text, reading, source].
// Hokkien readings are Tâi-lô with tone digits, following the Ministry of Education (MOE)
// 臺灣閩南語常用詞辭典 (https://sutian.moe.edu.tw/). Hakka readings follow the MOE
// 臺灣客家語常用詞辭典 (https://hakka.dict.moe.edu.tw/) romanization; Mandarin follows the
// 重編國語辭典修訂本 (https://dict.revised.moe.edu.tw/).
// This is a small hand-entered seed set: verify and extend it from the MOE data releases
// (mind each dataset's licence) before treating it as authoritative.

const NAN = 'MOE 臺灣閩南語常用詞辭典';
const HAK = 'MOE 臺灣客家語常用詞辭典';
const CMN = 'MOE 重編國語辭典修訂本';

export const NAN_RAW = [
  ['食', 'tsiah8', NAN], ['飯', 'png7', NAN], ['食飯', 'tsiah8-png7', NAN], ['水', 'tsui2', NAN],
  ['人', 'lang5', NAN], ['你', 'li2', NAN], ['我', 'gua2', NAN], ['伊', 'i1', NAN],
  ['好', 'ho2', NAN], ['你好', 'li2-ho2', NAN], ['恁好', 'lin2-ho2', NAN], ['無', 'bo5', NAN],
  ['有', 'u7', NAN], ['厝', 'tshu3', NAN], ['天', 'thinn1', NAN], ['地', 'te7', NAN],
  ['日', 'jit8', NAN], ['月', 'gueh8', NAN], ['冊', 'tsheh4', NAN], ['讀冊', 'thak8-tsheh4', NAN],
  ['臺灣', 'tai5-uan5', NAN], ['臺語', 'tai5-gi2', NAN], ['母語', 'bu2-gi2', NAN],
  ['多謝', 'to1-sia7', NAN], ['歡喜', 'huann1-hi2', NAN], ['朋友', 'ping5-iu2', NAN],
  ['故事', 'koo3-su7', NAN], ['鬥陣', 'tau3-tin7', NAN], ['欲', 'beh4', NAN], ['去', 'khi3', NAN],
  ['來', 'lai5', NAN], ['看', 'khuann3', NAN], ['講', 'kong2', NAN], ['寫', 'sia2', NAN],
  ['字', 'ji7', NAN], ['話', 'ue7', NAN], ['講話', 'kong2-ue7', NAN], ['阿母', 'a1-bu2', NAN],
  ['阿爸', 'a1-pa1', NAN], ['囡仔', 'gin2-a2', NAN], ['火', 'hue2', NAN], ['山', 'suann1', NAN],
  ['海', 'hai2', NAN], ['愛', 'ai3', NAN], ['大', 'tua7', NAN], ['細', 'se3', NAN],
  ['早安', 'tsa2-an1', NAN], ['暗頭', 'am3-thau5', NAN], ['新年', 'sin1-nii5', NAN],
];

export const HAK_RAW = [
  ['客家', 'hak-ga', HAK], ['水', 'sui', HAK], ['人', 'ngin', HAK], ['屋', 'vuk', HAK],
  ['食', 'sit', HAK], ['飯', 'fan', HAK], ['食飯', 'sit-fan', HAK], ['天', 'tien', HAK],
  ['山', 'san', HAK], ['好', 'ho', HAK], ['你', 'ngi', HAK], ['客語', 'hak-ngi', HAK],
];

export const CMN_RAW = [
  ['你', 'ㄋㄧˇ', CMN, 'ni'], ['我', 'ㄨㄛˇ', CMN, 'wo'], ['他', 'ㄊㄚ', CMN, 'ta'], ['好', 'ㄏㄠˇ', CMN, 'hao'],
  ['你好', 'ㄋㄧˇㄏㄠˇ', CMN, 'nihao'], ['謝謝', 'ㄒㄧㄝˋㄒㄧㄝ˙', CMN, 'xiexie'], ['臺灣', 'ㄊㄞˊㄨㄢ', CMN, 'taiwan'],
  ['故事', 'ㄍㄨˋㄕˋ', CMN, 'gushi'], ['語言', 'ㄩˇㄧㄢˊ', CMN, 'yuyan'], ['母語', 'ㄇㄨˇㄩˇ', CMN, 'muyu'],
  ['朋友', 'ㄆㄥˊㄧㄡˇ', CMN, 'pengyou'], ['文字', 'ㄨㄣˊㄗˋ', CMN, 'wenzi'], ['客家', 'ㄎㄜˋㄐㄧㄚ', CMN, 'kejia'],
  ['原住民', 'ㄩㄢˊㄓㄨˋㄇㄧㄣˊ', CMN, 'yuanzhumin'], ['閩南', 'ㄇㄧㄣˇㄋㄢˊ', CMN, 'minnan'],
  ['輸入法', 'ㄕㄨㄖㄨˋㄈㄚˇ', CMN, 'shurufa'], ['書寫', 'ㄕㄨㄒㄧㄝˇ', CMN, 'shuxie'],
];
