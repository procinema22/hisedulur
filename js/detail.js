const products = {
    "stiker-label": {
      nama: "Cetak Stiker Label",
      gambar: "img/layanan/stikeer.jpg",
      deskripsi: "Cetak stiker berkualitas untuk branding dan kemasan.",
      harga: [
        { qty: "1 - 10", price: 7000 },
        { qty: "11 - 50", price: 6500 }
      ],
      laminasi: ["Glossy", "Doff"],
      finishing: ["Cetak Saja", "Cutting"]
    },
  
    "print-hitam-putih": {
      nama: "Print Hitam Putih",
      gambar: "img/layanan/hitamputih.png",
      deskripsi: "Layanan cetak hitam putih cepat dan ekonomis.",
      harga: [
        { qty: "1 - 199", price: 300 },
        { qty: "200 - 399", price: 275 },
        { qty: "> 400", price: 250 }
      ]
    },
  
    "print-warna": {
      nama: "Print Warna",
      gambar: "img/layanan/warna.png",
      deskripsi: "Cetak Banyak Harga Beda",
      harga: [
        { qty: "Print Warna Biasa", price: 500 },
        { qty: "Print Warna Sedang", price: 1000 },
        { qty: "Print WarNa Full", price: 2000 },
        { qty: "Print A3+", price: 15000 },
        { qty: "Print A3 HVS 80 gsm", price: 3000 },
        { qty: "Print A3 HVS 100 gsm", price: 6000 },
       
        
      ]
    },
  
    "softcover": {
      nama: "Print Warna",
      gambar: "img/layanan/softcover.jpg",
      deskripsi: "Cetak Banyak Harga Beda",
      harga: [
        { qty: "Softcover A5", price: 4000 },
        { qty: "Softcover A5 + Laminasi", price: 8000 },
        { qty: "Softcover A4", price: 6000 },
        { qty: "Softcover A4 + Laminasi", price: 12000 },
        { qty: "Softcover Ivory  230 ", price: 10000 },
        { qty: "Softcover Ivory  230 + Laminasi", price: 15000 },
       
        
      ]
    },
  
    "hardcover": {
      nama: "Hardcover",
      gambar: "img/layanan/hardcover.jpg",
      deskripsi: "Cetak Hardcover Berkualitas Tinggi untuk Presentasi Profesional.",
      harga: [
        { qty: "Reguler", price: 40000 },
        { qty: "Exspres", price: 60000 },
        { qty: "Onde day", price: 70000 },
        
        
      ]
    }
  
  };
  
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  
  if (!products[id]) {
    document.body.innerHTML += "<p>Produk tidak ditemukan</p>";
  } else {
    const p = products[id];
  
    document.getElementById("productName").innerText = p.nama;
    document.getElementById("productImage").src = p.gambar;
    document.getElementById("productDesc").innerText = p.deskripsi;
  
    let table = "<tr><th>Jumlah</th><th>Harga</th></tr>";
    p.harga.forEach(h => {
      table += `<tr><td>${h.qty}</td><td>Rp ${h.price}</td></tr>`;
    });
    document.getElementById("priceTable").innerHTML = table;
  
    document.getElementById("laminasiSelect").innerHTML =
      `<option>Pilih Laminasi</option>` +
      p.laminasi.map(l => `<option>${l}</option>`).join("");
  
    document.getElementById("finishingSelect").innerHTML =
      `<option>Pilih Finishing</option>` +
      p.finishing.map(f => `<option>${f}</option>`).join("");
  }
  