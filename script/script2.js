let name_heading = document.querySelector(".top > h2")
let score_heading = document.querySelector(".top > h3")
let delete_name = document.querySelector(".del > button")
let overlay = document.querySelector(".main-pane > .overlay")
let get_q = document.querySelector(".overlay > .overlay-display > .buttons > .start> button")
let question_answer = document.querySelector(".main-pane > .qna")
let count = 0
let warner = document.querySelector(".overlay-display > .warner")
let cat_select = document.querySelector("#category")
let ques_diff = document.querySelector("#difficulty")
let ques_type = document.querySelector("#type")
let ques_amt = document.querySelector("#amount")
let game_customize = document.querySelector("#game_customizer")
let templ = getTemplate("connected-user")
let peer
let formt = document.querySelector(".bottom>.right>#new_conn")
let connected_peers_count = 0
let left = document.querySelector(".bottom>.left")



function toggle(){
    if(document.documentElement.getAttribute('data-theme') == 'dark'){
        document.documentElement.setAttribute('data-theme', 'light');
        e.target.setAttribute("title","Light Mode")
    } else{
        document.documentElement.setAttribute('data-theme', 'dark');
        e.target.setAttribute("title","Dark Mode")
    }
}

game_customize.classList.add("hider")
left.setAttribute('style','display:none')

fetch("https://opentdb.com/api_category.php").then(data => data.json()).then(json => json.trivia_categories).then(categories => {
    categories.forEach(category => {
        var opt = document.createElement('option');
        name = category.name.replace("Entertainment: ", "")
        name = name.replace("Japanese ", "")
        name = name.replace("Science: ", "")
        opt.appendChild(document.createTextNode(name));
        opt.value = category.id;
        cat_select.appendChild(opt)
    });
})

overlay.classList.add("inny")
setTimeout(() => {
    overlay.classList.remove("inny")
}, 900)

if (localStorage.getItem('User Name') != null) {
    get_q.disabled = false
    warner.setAttribute("style", "display:none")
    name_heading.innerText = localStorage.getItem('User Name')
    score_heading.innerText = localStorage.getItem('User Score')
    peering()
} else {
    name_heading.parentNode.prepend(getTemplate("formmer"))
}

get_q.addEventListener("click", e => {

    let triviaclone = getTemplate("trivia")
    let question_category
    let question_difficulty
    let question_amount
    let question_type
    let question_url

    if (cat_select.value != null && cat_select.value != "") {
        question_category = "&category=" + cat_select.value
    } else {
        question_category = ""
    }

    if (ques_diff.value != null && ques_diff.value != "") {
        question_difficulty = "&difficulty=" + ques_diff.value
    } else {
        question_difficulty = ""
    }

    if (ques_type.value != null && ques_type.value != "") {
        question_type = "&type=" + ques_type.value
    } else {
        question_type = ""
    }

    if (ques_amt.value != null && ques_amt.value != "") {
        question_amount = "amount=" + ques_amt.value
    } else {
        question_amount = "amount=10"
    }

    question_url = "https://opentdb.com/api.php?" + question_amount + question_category + question_type + question_difficulty

    question_answer.appendChild(triviaclone)

    overlay.classList.add("outy")
    setTimeout(() => {
        overlay.classList.remove("outy")
        overlay.setAttribute("style", "display:none")
    }, 900)
})

function getTemplate(TId) {
    if (!window.templates) {
        window.templates = {}
    }

    if (!window.templates[TId]) {
        window.templates[TId] = document.querySelector(`template#${TId}`).content
    }
    // return window.templates[TId].content.cloneNode(true)
    return document.importNode(window.templates[TId], true)
}

delete_name.addEventListener("click", e => {
    if (localStorage.getItem("User Name") != null) {
        peer.destroy(()=>{
            console.log("destroyed")
        })
        name_heading.parentNode.prepend(getTemplate("formmer"))
        localStorage.removeItem("User Name")
        name_heading.innerText = "Enter User Name"
        score_heading.innerText = "0"
        if (overlay.style.display == "none") {
            overlay.classList.add("inny")
            overlay.setAttribute("style", "display:block")
        } else {
            warner.classList.add("inny3")
            warner.setAttribute("style", "display:block")
        }
        get_q.disabled = true
        formt.querySelector("input[type='submit']").disabled = true
        setTimeout(() => {
            warner.classList.remove("inny3")
            overlay.classList.remove("inny")
            question_answer.innerHTML = ""
            snack("Disconnected")
        }, 300)
    }
})

function api_config(e) {
    // if (e.target.classList.contains("rotater")) {
    //     e.target.classList.remove("rotater")
    //     e.target.classList.add("rotater1")
    // } else {
    //     e.target.classList.remove("rotater1")
    //     e.target.classList.add("rotater")
    // }
    setTimeout(() => {
        game_customize.classList.toggle("hider")
        game_customize.classList.add("inny")
        document.querySelectorAll(".remove_on_setting").forEach(el => {
            el.classList.toggle("hider")
            el.classList.add("inny")
        })

        setTimeout(() => {
            game_customize.classList.remove("inny")
            document.querySelectorAll(".remove_on_setting").forEach(el => {
                el.classList.remove("inny")
            })
        }, 300)

    }, 300)

}

function finn(e) {

    overlay.classList.add("inny")
    overlay.setAttribute("style", "display:block")
    setTimeout(() => {
        overlay.classList.remove("inny")
        question_answer.innerHTML = ""
    }, 900)
}


function peering(){
    peer = new Peer(localStorage.getItem("User Name"));
    peer.on('open', function(id) {
        console.log("connected")
        formt.querySelector("input[type='submit']").disabled = false
        snack("Connected")
    });

    peer.on('connection', function(conn) {
        conn.on('open', () => {
            connection_basic(conn)
        });
    });
}

function connection_basic(conn){
    conn.send({
        name: localStorage.getItem("User Name"),
        score: localStorage.getItem("User Score")
    });
    conn.on('data', function(data) {
        let temp2 = getTemplate("connected-user")
        temp2.querySelector(".participant-info > .info >.participant-name").innerText = data.name
        temp2.querySelector(".participant-info > .info >.participant-score").innerText = data.score
        left.appendChild(temp2)
        if(connected_peers_count == 0){
            left.setAttribute('style','display:flex')
            connected_peers_count++
        }
    });
}

formt.addEventListener("submit", e => {
    // debugger
    let name = e.target.querySelector("#new_conn_name")
    e.preventDefault()

    let conn = peer.connect(name.value);
    // on open will be launch when you successfully connect to PeerServer
    conn.on('open', () => {
        connection_basic(conn)
    });
})

function snack(message) {
    // Get the snackbar DIV
    var x = document.querySelector("#snackbar");
  
    // Add the "show" class to DIV
    x.className = "show";
    x.querySelector("#message").innerText = message
  
    // After 3 seconds, remove the show class from DIV
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
  }