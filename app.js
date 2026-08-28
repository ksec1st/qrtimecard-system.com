// QR TIME CARD - Firebase / Cloud Firestore shared version

const firebaseConfig = {
  apiKey: "AIzaSyAVePUYtjPvgt-DKeFybiKH9vVTlu6Jbow",
  authDomain: "qr-time-card-1ae06.firebaseapp.com",
  projectId: "qr-time-card-1ae06",
  storageBucket: "qr-time-card-1ae06.firebasestorage.app",
  messagingSenderId: "123663536947",
  appId: "1:123663536947:web:564de370f42f15011ce446"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const $ = s => document.querySelector(s);

const today = () =>
  new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo"
  });

const nowISO = () => new Date().toISOString();

let records = [];
let staff = [];

let initialized = false;

let staffUnsubscribe = null;
let recordsUnsubscribe = null;


/* =========================
   共通
========================= */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}


function fmt(iso) {
  if (!iso) return "--:--";

  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo"
  });
}


function dateFmt() {
  return new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo"
  });
}


function getToday() {
  return records.filter(r => r.date === today());
}


function getLatest(id) {
  return records
    .filter(r =>
      r.staffId === id &&
      r.date === today()
    )
    .sort((a, b) =>
      new Date(b.time) - new Date(a.time)
    )[0];
}


/* =========================
   ステータス
========================= */

function setStatus(text, error = false) {

  $("#clockStatus").textContent = text;

  $("#clockStatus").style.color =
    error
      ? "var(--red)"
      : "var(--green)";
}


/* =========================
   Firebase 初期化
========================= */

async function initFirebaseData() {

  try {

    const snap =
      await db
        .collection("staff")
        .limit(1)
        .get();


    /*
     * スタッフが1人もいない場合、
     * サンプルスタッフを1人作成
     */

    if (snap.empty) {

      await db
        .collection("staff")
        .doc("NM-0001")
        .set({

          id: "NM-0001",

          name: "サンプルスタッフ",

          createdAt:
            firebase.firestore.FieldValue
              .serverTimestamp()

        });

    }


    initialized = true;

    setStatus(
      "Firebaseに接続しました。QRコードをかざしてください。"
    );


  } catch (e) {

    console.error(e);

    setStatus(
      "Firebaseに接続できません。Firestoreのルールを確認してください。",
      true
    );

  }

}


/* =========================
   リアルタイム同期
========================= */

function startRealtimeSync() {

  if (staffUnsubscribe) {
    staffUnsubscribe();
  }

  if (recordsUnsubscribe) {
    recordsUnsubscribe();
  }


  /*
   * スタッフ情報
   */

  staffUnsubscribe =
    db
      .collection("staff")
      .onSnapshot(

        snap => {

          staff =
            snap.docs
              .map(doc => ({

                id: doc.id,

                name:
                  doc.data().name || ""

              }))
              .sort((a, b) =>
                a.id.localeCompare(b.id)
              );


          renderAdmin();

        },

        err => {

          console.error(
            "staff listener:",
            err
          );

          setStatus(
            "スタッフ情報を取得できません。",
            true
          );

        }

      );


  /*
   * 勤怠情報
   */

  recordsUnsubscribe =
    db
      .collection("records")
      .onSnapshot(

        snap => {

          records =
            snap.docs.map(doc => ({

              id: doc.id,

              ...doc.data()

            }));


          renderAdmin();

        },

        err => {

          console.error(
            "records listener:",
            err
          );

          setStatus(
            "勤怠データを取得できません。",
            true
          );

        }

      );

}


/* =========================
   出退勤打刻
========================= */

async function punch(id) {

  if (!initialized) {

    setStatus(
      "Firebaseへ接続中です。少し待ってください。",
      true
    );

    return;
  }


  const s =
    staff.find(x => x.id === id);


  if (!s) {

    setStatus(
      "登録されていないスタッフIDです",
      true
    );

    return;
  }


  const last =
    getLatest(id);


  /*
   * 最後が退勤
   * または今日まだ打刻していない
   * → 出勤
   *
   * 最後が出勤
   * → 退勤
   */

  const type =
    (!last || last.type === "out")
      ? "in"
      : "out";


  try {

    const data = {

      staffId: id,

      name: s.name,

      date: today(),

      time: nowISO(),

      type: type

    };


    const ref =
      db
        .collection("records")
        .doc();


    await ref.set(data);


    showResult(
      s,
      type
    );


    renderAdmin();


  } catch (e) {

    console.error(e);

    setStatus(
      "勤怠の保存に失敗しました。Firestoreのルールを確認してください。",
      true
    );

  }

}


/* =========================
   打刻完了モーダル
========================= */

function showResult(s, type) {

  $("#modalContent").innerHTML = `

    <div class="success">

      <div class="big">
        ${type === "in" ? "🟢" : "🔴"}
      </div>

      <h2>
        ${esc(s.name)}さん
      </h2>

      <p>
        ${type === "in" ? "出勤" : "退勤"}
        を記録しました。
      </p>

      <h3>
        ${fmt(nowISO())}
      </h3>

      <button
        class="primary"
        id="ok"
      >
        OK
      </button>

    </div>

  `;


  $("#modal")
    .classList
    .remove("hidden");


  $("#ok").onclick = () => {

    $("#modal")
      .classList
      .add("hidden");

  };


  setStatus(
    `${s.name}さんの${type === "in" ? "出勤" : "退勤"}を記録しました`
  );

}


/* =========================
   管理画面
========================= */

function renderAdmin() {

  const t =
    getToday();


  /*
   * スタッフ数
   */

  $("#staffCount").textContent =
    staff.length;


  /*
   * 今日出勤した人数
   */

  $("#todayIn").textContent =
    new Set(

      t
        .filter(x => x.type === "in")
        .map(x => x.staffId)

    ).size;


  /*
   * 現在出勤中
   */

  $("#todayWorking").textContent =
    staff.filter(s => {

      const latest =
        getLatest(s.id);

      return latest?.type === "in";

    }).length;


  /*
   * 今日の打刻件数
   */

  $("#todayPunches").textContent =
    t.length;


  /*
   * 打刻画面にも反映
   */

  $("#workingCount").textContent =
    $("#todayWorking").textContent;

  $("#punchCount").textContent =
    t.length;


  /*
   * 検索
   */

  const q =
    ($("#search")?.value || "")
      .toLowerCase();


  /*
   * 本日の勤怠
   */

  $("#attendanceBody").innerHTML =

    staff

      .filter(s =>
        (s.name + s.id)
          .toLowerCase()
          .includes(q)
      )

      .map(s => {

        const arr =
          t

            .filter(x =>
              x.staffId === s.id
            )

            .sort((a, b) =>
              new Date(a.time) -
              new Date(b.time)
            );


        const ins =
          arr.filter(x =>
            x.type === "in"
          );


        const outs =
          arr.filter(x =>
            x.type === "out"
          );


        const last =
          arr.at(-1);


        return `

          <tr>

            <td>
              ${esc(s.name)}
            </td>

            <td>
              ${esc(s.id)}
            </td>

            <td>
              ${fmt(ins[0]?.time)}
            </td>

            <td>
              ${fmt(outs.at(-1)?.time)}
            </td>

            <td>

              <span
                class="pill ${
                  last?.type === "in"
                    ? "on"
                    : "off"
                }"
              >

                ${
                  last?.type === "in"
                    ? "出勤中"
                    : "退勤"
                }

              </span>

            </td>

          </tr>

        `;

      })

      .join("")

      ||

      `
        <tr>
          <td colspan="5">
            データがありません
          </td>
        </tr>
      `;


  /*
   * スタッフ一覧
   */

  $("#staffBody").innerHTML =

    staff.map(s => `

      <tr>

        <td>
          ${esc(s.name)}
        </td>

        <td>
          ${esc(s.id)}
        </td>

        <td>

          <button
            class="ghost small qr"
            data-id="${esc(s.id)}"
          >
            表示
          </button>

        </td>

        <td>

          <button
            class="danger small del"
            data-id="${esc(s.id)}"
          >
            削除
          </button>

        </td>

      </tr>

    `).join("");


  /*
   * QRボタン
   */

  document
    .querySelectorAll(".qr")
    .forEach(b => {

      b.onclick = () =>
        showQR(b.dataset.id);

    });


  /*
   * 削除ボタン
   */

  document
    .querySelectorAll(".del")
    .forEach(b => {

      b.onclick = async () => {

        if (
          !confirm(
            "このスタッフを削除しますか？"
          )
        ) {
          return;
        }


        try {

          await db
            .collection("staff")
            .doc(b.dataset.id)
            .delete();


        } catch (e) {

          console.error(e);

          alert(
            "スタッフの削除に失敗しました。"
          );

        }

      };

    });

}


/* =========================
   QRコード表示
========================= */

function showQR(id) {

  const s =
    staff.find(x => x.id === id);


  if (!s) return;


  $("#modalContent").innerHTML = `

    <h3>
      ${esc(s.name)} のスタッフQR
    </h3>

    <div class="qrbox">

      <div id="qrTarget"></div>

    </div>

    <p
      style="
        text-align:center;
        color:var(--muted)
      "
    >
      ID: ${esc(s.id)}
    </p>

    <p
      style="
        text-align:center;
        display:flex;
        gap:8px;
        justify-content:center
      "
    >

      <button
        class="primary"
        id="downloadQR"
      >
        PNG保存
      </button>

      <button
        class="ghost"
        id="printQR"
      >
        印刷
      </button>

    </p>

  `;


  $("#modal")
    .classList
    .remove("hidden");


  const target =
    $("#qrTarget");


  if (
    typeof QRCode ===
    "undefined"
  ) {

    target.innerHTML = `

      <div
        style="
          padding:25px;
          color:#222;
          background:#fff;
          border-radius:8px
        "
      >

        <strong>
          QRライブラリを読み込めませんでした
        </strong>

        <br>

        <small>
          ページを再読み込みしてください。
        </small>

      </div>

    `;

    return;
  }


  QRCode.toCanvas(

    s.id,

    {

      width: 260,

      margin: 2,

      errorCorrectionLevel: "M"

    },

    (err, canvas) => {

      if (err) {

        console.error(err);

        target.innerHTML = `

          <p style="color:#d33">

            QRコードの生成に失敗しました。

          </p>

        `;

        return;
      }


      target.replaceChildren(
        canvas
      );


      /*
       * PNG保存
       */

      $("#downloadQR").onclick =
        () => {

          const a =
            document.createElement("a");

          a.download =
            `${s.id}_QR.png`;

          a.href =
            canvas.toDataURL(
              "image/png"
            );

          a.click();

        };


      /*
       * 印刷
       */

      $("#printQR").onclick =
        () => {

          const data =
            canvas.toDataURL(
              "image/png"
            );


          const w =
            window.open(
              "",
              "_blank"
            );


          if (!w) {

            alert(
              "ポップアップがブロックされています。許可してからもう一度お試しください。"
            );

            return;
          }


          w.document.write(`

            <html>

              <head>

                <title>
                  ${esc(s.name)} QR
                </title>

              </head>

              <body
                style="
                  text-align:center;
                  font-family:sans-serif;
                  padding:40px
                "
              >

                <h2>
                  ${esc(s.name)}
                </h2>

                <img
                  src="${data}"
                  style="
                    width:300px;
                    height:300px
                  "
                >

                <p>
                  ${esc(s.id)}
                </p>

              </body>

            </html>

          `);


          w.document.close();


          setTimeout(
            () => w.print(),
            300
          );

        };

    }

  );

}


/* =========================
   モーダル
========================= */

$("#closeModal").onclick =
  () =>
    $("#modal")
      .classList
      .add("hidden");


$("#modal").onclick =
  e => {

    if (
      e.target.id === "modal"
    ) {

      $("#modal")
        .classList
        .add("hidden");

    }

  };


/* =========================
   ナビゲーション
========================= */

document
  .querySelectorAll(".nav")
  .forEach(b => {

    b.onclick = () => {

      document
        .querySelectorAll(".nav")
        .forEach(x =>
          x.classList.remove("active")
        );


      b.classList.add("active");


      document
        .querySelectorAll(".page")
        .forEach(x =>
          x.classList.remove("active")
        );


      $("#" + b.dataset.page)
        .classList
        .add("active");


      if (
        b.dataset.page ===
        "admin"
      ) {

        renderAdmin();

      }

    };

  });


/* =========================
   ID手入力
========================= */

$("#manualBtn").onclick =
  () => {

    const id =
      prompt(
        "スタッフIDを入力してください"
      );


    if (id) {

      punch(
        id.trim()
      );

    }

  };


/* =========================
   スタッフ追加
========================= */

$("#addStaffBtn").onclick =
  () => {

    $("#modalContent").innerHTML = `

      <h3>
        スタッフ追加
      </h3>

      <div class="form">

        <input
          id="newName"
          placeholder="名前"
        >

        <input
          id="newId"
          placeholder="スタッフID（例：NM-0002）"
        >

        <button
          class="primary"
          id="saveNew"
        >
          登録
        </button>

      </div>

    `;


    $("#modal")
      .classList
      .remove("hidden");


    $("#saveNew").onclick =
      async () => {

        const name =
          $("#newName")
            .value
            .trim();


        const id =
          $("#newId")
            .value
            .trim();


        if (!name || !id) {

          alert(
            "名前とIDを入力してください"
          );

          return;
        }


        if (
          staff.some(
            s => s.id === id
          )
        ) {

          alert(
            "そのIDは既に存在します"
          );

          return;
        }


        try {

          await db
            .collection("staff")
            .doc(id)
            .set({

              id,

              name,

              createdAt:
                firebase.firestore
                  .FieldValue
                  .serverTimestamp()

            });


          $("#modal")
            .classList
            .add("hidden");


        } catch (e) {

          console.error(e);

          alert(
            "スタッフの登録に失敗しました。"
          );

        }

      };

  };


/* =========================
   検索
========================= */

$("#search").oninput =
  renderAdmin;


/* =========================
   CSV出力
========================= */

$("#exportBtn").onclick =
  () => {

    const rows = [

      [
        "日時",
        "日付",
        "スタッフID",
        "名前",
        "区分"
      ],

      ...records.map(r => [

        r.time,

        r.date,

        r.staffId,

        r.name,

        r.type === "in"
          ? "出勤"
          : "退勤"

      ])

    ];


    const csv =
      "\uFEFF" +

      rows

        .map(r =>
          r
            .map(v =>
              `"${String(v ?? "")
                .replaceAll('"', '""')}"`
            )
            .join(",")
        )

        .join("\n");


    const a =
      document.createElement("a");


    a.href =
      URL.createObjectURL(

        new Blob(
          [csv],
          { type:"text/csv" }
        )

      );


    a.download =
      `timecard_${today()}.csv`;


    a.click();

  };


/* =========================
   全勤怠削除
========================= */

$("#clearBtn").onclick =
  async () => {

    if (
      !confirm(
        "勤怠記録をすべて削除します。スタッフ情報は残ります。"
      )
    ) {

      return;

    }


    try {

      const snap =
        await db
          .collection("records")
          .get();


      /*
       * Firestore batch
       */

      const batch =
        db.batch();


      snap.docs.forEach(doc => {

        batch.delete(
          doc.ref
        );

      });


      await batch.commit();


      renderAdmin();


    } catch (e) {

      console.error(e);

      alert(
        "勤怠記録の削除に失敗しました。"
      );

    }

  };


/* =========================
   QRカメラ
========================= */

let stream = null;

let canvas =
  document.createElement(
    "canvas"
  );

let ctx =
  canvas.getContext(
    "2d",
    {
      willReadFrequently:true
    }
  );

let scanning = false;


/* =========================
   カメラ起動
========================= */

async function startCamera() {

  try {

    if (stream) {

      stream
        .getTracks()
        .forEach(
          t => t.stop()
        );

    }


    stream =
      await navigator
        .mediaDevices
        .getUserMedia({

          video: {

            facingMode: {
              ideal:"environment"
            },

            width: {
              ideal:1280
            },

            height: {
              ideal:720
            }

          },

          audio:false

        });


    $("#video")
      .srcObject =
      stream;


    scanning = true;


    $("#cameraHint")
      .textContent =
      "QRコードをかざしてください";


    scanLoop();


  } catch(e) {

    console.error(e);


    $("#cameraHint")
      .textContent =
      "カメラを使用できません。ID手入力をご利用ください。";


    setStatus(
      "カメラへのアクセスを許可してください",
      true
    );

  }

}


/* =========================
   QR読み取り
========================= */

function scanLoop() {

  if (!scanning) return;


  const v =
    $("#video");


  if (v.readyState >= 2) {

    canvas.width =
      v.videoWidth;

    canvas.height =
      v.videoHeight;


    ctx.drawImage(
      v,
      0,
      0
    );


    const d =
      ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );


    const code =
      jsQR(
        d.data,
        d.width,
        d.height,
        {
          inversionAttempts:
            "dontInvert"
        }
      );


    if (code?.data) {

      scanning = false;


      punch(
        code.data.trim()
      );


      setTimeout(
        () => {

          scanning = true;

          scanLoop();

        },
        2200
      );


      return;

    }

  }


  requestAnimationFrame(
    scanLoop
  );

}


$("#startCamera").onclick =
  startCamera;


/* =========================
   時計
========================= */

setInterval(
  () => {

    $("#dateNow")
      .textContent =
      dateFmt();


    $("#timeNow")
      .textContent =
      new Date()
        .toLocaleTimeString(
          "ja-JP",
          {
            hour12:false,
            timeZone:"Asia/Tokyo"
          }
        );

  },
  1000
);


/* =========================
   起動
========================= */

(async function boot() {

  $("#dateNow")
    .textContent =
    dateFmt();


  renderAdmin();


  await initFirebaseData();


  startRealtimeSync();

})();
