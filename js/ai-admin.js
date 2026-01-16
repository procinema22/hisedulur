function aiSend(){
    const input = document.getElementById("ai-input");
    const text = input.value.trim();
    if(!text) return;
  
    addMsg("👤", text);
    input.value = "";
  
    setTimeout(()=>{
      const reply = aiLogic(text.toLowerCase());
      addMsg("🤖", reply);
    },400);
  }
  
  function addMsg(sender, text){
    const box = document.getElementById("ai-messages");
    box.innerHTML += `<div><b>${sender}</b> ${text}</div>`;
    box.scrollTop = box.scrollHeight;
  }
  
  function aiLogic(text){
  
    // JAM BUKA
    if(text.includes("buka")){
      return "Kami buka setiap hari jam 08.00 – 21.00 😊";
    }
  
    // HARGA
    if(text.includes("hitam")){
      return "Print hitam putih A4: Rp150 / lembar";
    }
  
    if(text.includes("warna")){
      return "Print warna A4: Rp500 / lembar";
    }
  
    // HITUNG HARGA
    if(text.includes("lembar")){
      const jumlah = parseInt(text);
      if(!isNaN(jumlah)){
        return `Perkiraan harga: ${jumlah} x Rp150 = Rp${jumlah*150}`;
      }
    }
  
    // INVOICE
    if(text.includes("invoice")){
      const kode = "INV-"+Date.now();
      return `Invoice berhasil dibuat\nNomor: ${kode}`;
    }
  
    return "Maaf, admin belum paham. Bisa jelaskan lebih detail?";
  }
  